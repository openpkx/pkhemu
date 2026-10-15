use std::collections::BTreeSet;
use std::future::Future;
use std::sync::{Arc, Mutex, MutexGuard};
use tokio::sync::oneshot;

#[derive(Clone, Debug, PartialEq)]
pub enum Request {
    All,
    Games(BTreeSet<String>),
}

impl Request {
    pub fn game(path: &str) -> Request {
        Request::Games(BTreeSet::from([path.to_string()]))
    }
}

struct Waiting<T> {
    games: Option<(BTreeSet<String>, Vec<oneshot::Sender<T>>)>,
    all: Option<Vec<oneshot::Sender<T>>>,
    running: bool,
}

impl<T> Waiting<T> {
    fn add(&mut self, request: Request, reply: Option<oneshot::Sender<T>>) {
        let replies = match request {
            Request::Games(more) => {
                let (games, replies) = self.games.get_or_insert_default();
                games.extend(more);
                replies
            }
            Request::All => self.all.get_or_insert_default(),
        };
        replies.extend(reply);
    }

    // A game about to open waits on its own files, not on a sync of everything queued before it.
    fn next(&mut self) -> Option<(Request, Vec<oneshot::Sender<T>>)> {
        match self.games.take() {
            Some((games, replies)) => Some((Request::Games(games), replies)),
            None => self.all.take().map(|replies| (Request::All, replies)),
        }
    }
}

pub trait KeepAlive: Send + 'static {
    fn begin(&self);
    fn end(&self);
}

impl KeepAlive for () {
    fn begin(&self) {}
    fn end(&self) {}
}

// A sync that panics drops its waiters and lets the next request start a new run.
struct Stopped<T: Clone + Send + 'static, K: KeepAlive> {
    queue: Arc<Queue<T>>,
    keep_alive: K,
}

impl<T: Clone + Send + 'static, K: KeepAlive> Drop for Stopped<T, K> {
    fn drop(&mut self) {
        if !std::thread::panicking() {
            return;
        }
        let mut waiting = self.queue.waiting();
        waiting.running = false;
        waiting.games = None;
        waiting.all = None;
        self.keep_alive.end();
    }
}

/// Runs one sync at a time. Requests made while one runs wait, games together ahead of a sync of everything.
pub struct Queue<T> {
    waiting: Mutex<Waiting<T>>,
}

impl<T: Clone + Send + 'static> Queue<T> {
    pub fn new() -> Queue<T> {
        Queue { waiting: Mutex::new(Waiting { games: None, all: None, running: false }) }
    }

    fn waiting(&self) -> MutexGuard<'_, Waiting<T>> {
        self.waiting.lock().unwrap_or_else(|e| e.into_inner())
    }

    pub fn games_waiting(&self) -> bool {
        self.waiting().games.is_some()
    }

    // Their callers get None, and the run's loop finds nothing left and ends.
    pub fn drop_waiting(&self) {
        let mut waiting = self.waiting();
        waiting.games = None;
        waiting.all = None;
    }

    // Only a running sync calls this, so its loop picks the request up.
    pub fn run_after(&self, request: Request) {
        self.waiting().add(request, None);
    }

    // Begin and end both happen under the queue's lock, so a request that starts a new run can't slip between the old
    // run's end and its own begin.
    pub fn run<K, F, Fut>(self: &Arc<Self>, request: Request, keep_alive: K, sync: F) -> impl Future<Output = Option<T>>
    where
        K: KeepAlive,
        F: Fn(Request) -> Fut + Send + 'static,
        Fut: Future<Output = T> + Send,
    {
        let (reply, result) = oneshot::channel();
        let lead = {
            let mut waiting = self.waiting();
            waiting.add(request, Some(reply));
            let lead = !std::mem::replace(&mut waiting.running, true);
            if lead {
                keep_alive.begin();
            }
            lead
        };
        if lead {
            let queue = self.clone();
            tauri::async_runtime::spawn(async move {
                let stopped = Stopped { queue: queue.clone(), keep_alive };
                loop {
                    let (request, replies) = {
                        let mut waiting = queue.waiting();
                        match waiting.next() {
                            Some(next) => next,
                            None => {
                                waiting.running = false;
                                stopped.keep_alive.end();
                                return;
                            }
                        }
                    };
                    let result = sync(request).await;
                    for reply in replies {
                        let _ = reply.send(result.clone());
                    }
                }
            });
        }
        async move { result.await.ok() }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::async_runtime::block_on;

    #[test]
    fn collapses_requests_that_queue_up_while_a_sync_runs() {
        let queue = Arc::new(Queue::new());
        let runs = Arc::new(Mutex::new(Vec::new()));
        let (release, released) = oneshot::channel::<()>();
        let released = Arc::new(Mutex::new(Some(released)));
        let (started, has_started) = std::sync::mpsc::channel();
        let sync = {
            let runs = runs.clone();
            move |request: Request| {
                let (runs, released, started) = (runs.clone(), released.clone(), started.clone());
                async move {
                    runs.lock().unwrap().push(request.clone());
                    let _ = started.send(());
                    let gate = released.lock().unwrap().take();
                    if let Some(gate) = gate {
                        let _ = gate.await;
                    }
                    format!("{request:?}")
                }
            }
        };

        let first = queue.run(Request::game("gb/Red.gb"), (), sync.clone());
        has_started.recv().unwrap();
        let second = queue.run(Request::game("gba/Emerald.gba"), (), sync.clone());
        let third = queue.run(Request::game("gbc/Crystal.gbc"), (), sync.clone());
        release.send(()).unwrap();

        let (first, second, third) = block_on(async { (first.await, second.await, third.await) });
        let collapsed = Request::Games(BTreeSet::from(["gba/Emerald.gba".into(), "gbc/Crystal.gbc".into()]));
        assert_eq!(*runs.lock().unwrap(), [Request::game("gb/Red.gb"), collapsed.clone()]);
        assert_eq!(first, Some(format!("{:?}", Request::game("gb/Red.gb"))));
        assert_eq!(second, Some(format!("{collapsed:?}")));
        assert_eq!(third, second);
    }

    #[derive(Clone, Default)]
    struct Calls(Arc<Mutex<Vec<&'static str>>>);

    impl KeepAlive for Calls {
        fn begin(&self) {
            self.0.lock().unwrap().push("begin");
        }

        fn end(&self) {
            self.0.lock().unwrap().push("end");
        }
    }

    #[test]
    fn keeps_the_app_alive_once_across_runs_that_merge() {
        let queue = Arc::new(Queue::new());
        let calls = Calls::default();
        let (release, released) = oneshot::channel::<()>();
        let released = Arc::new(Mutex::new(Some(released)));
        let (started, has_started) = std::sync::mpsc::channel();
        let sync = move |_: Request| {
            let (released, started) = (released.clone(), started.clone());
            async move {
                let _ = started.send(());
                let gate = released.lock().unwrap().take();
                if let Some(gate) = gate {
                    let _ = gate.await;
                }
            }
        };

        let first = queue.run(Request::game("gb/Red.gb"), calls.clone(), sync.clone());
        has_started.recv().unwrap();
        let second = queue.run(Request::game("gba/Emerald.gba"), calls.clone(), sync.clone());
        let third = queue.run(Request::All, calls.clone(), sync.clone());
        assert_eq!(*calls.0.lock().unwrap(), ["begin"]);
        release.send(()).unwrap();
        block_on(async { (first.await, second.await, third.await) });
        while queue.waiting().running {
            std::thread::yield_now();
        }

        assert_eq!(*calls.0.lock().unwrap(), ["begin", "end"]);
    }

    #[test]
    fn dropping_waiting_requests_ends_the_run_once() {
        let queue = Arc::new(Queue::new());
        let calls = Calls::default();
        let (release, released) = oneshot::channel::<()>();
        let released = Arc::new(Mutex::new(Some(released)));
        let (started, has_started) = std::sync::mpsc::channel();
        let sync = move |_: Request| {
            let (released, started) = (released.clone(), started.clone());
            async move {
                let _ = started.send(());
                let gate = released.lock().unwrap().take();
                if let Some(gate) = gate {
                    let _ = gate.await;
                }
                "synced"
            }
        };

        let first = queue.run(Request::All, calls.clone(), sync.clone());
        has_started.recv().unwrap();
        let waiting = queue.run(Request::All, calls.clone(), sync.clone());
        queue.drop_waiting();
        release.send(()).unwrap();

        assert_eq!(block_on(async { (first.await, waiting.await) }), (Some("synced"), None));
        while queue.waiting().running {
            std::thread::yield_now();
        }
        assert_eq!(*calls.0.lock().unwrap(), ["begin", "end"]);
    }

    #[test]
    fn lets_the_app_go_after_a_sync_panics() {
        let queue = Arc::new(Queue::new());
        let calls = Calls::default();

        block_on(queue.run(Request::All, calls.clone(), |_| async { panic!("sync failed") }));
        block_on(queue.run(Request::All, calls.clone(), |_| async {}));
        while queue.waiting().running {
            std::thread::yield_now();
        }

        assert_eq!(*calls.0.lock().unwrap(), ["begin", "end", "begin", "end"]);
    }

    #[test]
    fn runs_again_after_a_sync_panics() {
        let queue = Arc::new(Queue::new());

        let panicked = block_on(queue.run(Request::All, (), |_| async { panic!("sync failed") }));
        let next = block_on(queue.run(Request::All, (), |_| async { "synced" }));

        assert_eq!((panicked, next), (None, Some("synced")));
    }

    #[test]
    fn runs_games_ahead_of_a_sync_of_everything_queued_before_them() {
        let queue = Arc::new(Queue::new());
        let runs = Arc::new(Mutex::new(Vec::new()));
        let (release, released) = oneshot::channel::<()>();
        let released = Arc::new(Mutex::new(Some(released)));
        let (started, has_started) = std::sync::mpsc::channel();
        let sync = {
            let runs = runs.clone();
            move |request: Request| {
                let (runs, released, started) = (runs.clone(), released.clone(), started.clone());
                async move {
                    runs.lock().unwrap().push(request.clone());
                    let _ = started.send(());
                    let gate = released.lock().unwrap().take();
                    if let Some(gate) = gate {
                        let _ = gate.await;
                    }
                    format!("{request:?}")
                }
            }
        };

        let first = queue.run(Request::All, (), sync.clone());
        has_started.recv().unwrap();
        let everything = queue.run(Request::All, (), sync.clone());
        let game = queue.run(Request::game("gb/Red.gb"), (), sync.clone());
        assert!(queue.games_waiting());
        release.send(()).unwrap();

        let (_, everything, game) = block_on(async { (first.await, everything.await, game.await) });
        assert_eq!(*runs.lock().unwrap(), [Request::All, Request::game("gb/Red.gb"), Request::All]);
        assert_eq!(game, Some(format!("{:?}", Request::game("gb/Red.gb"))));
        assert_eq!(everything, Some(format!("{:?}", Request::All)));
    }

    #[test]
    fn a_sync_can_queue_another_after_itself() {
        let queue = Arc::new(Queue::new());
        let runs = Arc::new(Mutex::new(Vec::new()));
        let sync = {
            let (queue, runs) = (queue.clone(), runs.clone());
            move |request: Request| {
                let (queue, runs) = (queue.clone(), runs.clone());
                async move {
                    let mut runs = runs.lock().unwrap();
                    if runs.is_empty() {
                        queue.run_after(Request::All);
                    }
                    runs.push(request);
                }
            }
        };

        block_on(queue.run(Request::All, (), sync));
        while queue.waiting().running {
            std::thread::yield_now();
        }

        assert_eq!(*runs.lock().unwrap(), [Request::All, Request::All]);
    }
}
