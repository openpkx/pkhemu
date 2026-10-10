use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::Arc;

pub struct Request {
    pub method: String,
    pub path: String,
    pub query: Vec<(String, String)>,
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

impl Request {
    pub fn param(&self, name: &str) -> Option<&str> {
        self.query.iter().find(|(key, _)| key == name).map(|(_, value)| value.as_str())
    }

    pub fn header(&self, name: &str) -> Option<&str> {
        self.headers.iter().find(|(key, _)| key.eq_ignore_ascii_case(name)).map(|(_, value)| value.as_str())
    }

    pub fn form(&self) -> Vec<(String, String)> {
        url::form_urlencoded::parse(&self.body).into_owned().collect()
    }
}

pub enum Reply {
    Send { status: u16, headers: Vec<(String, String)>, body: Vec<u8> },
    DropConnection,
}

impl Reply {
    pub fn status(status: u16) -> Reply {
        Reply::Send { status, headers: Vec::new(), body: Vec::new() }
    }

    pub fn json(status: u16, json: serde_json::Value) -> Reply {
        Reply::Send { status, headers: vec![("Content-Type".into(), "application/json".into())], body: json.to_string().into_bytes() }
    }

    pub fn bytes(body: Vec<u8>) -> Reply {
        Reply::Send { status: 200, headers: Vec::new(), body }
    }

    pub fn with(mut self, name: &str, value: impl Into<String>) -> Reply {
        if let Reply::Send { headers, .. } = &mut self {
            headers.push((name.into(), value.into()));
        }
        self
    }
}

type Handler = dyn Fn(Request) -> Reply + Send + Sync;

pub struct Server {
    pub url: String,
}

impl Server {
    pub fn start(handler: impl Fn(Request) -> Reply + Send + Sync + 'static) -> Server {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!("http://{}", listener.local_addr().unwrap());
        let handler: Arc<Handler> = Arc::new(handler);
        std::thread::spawn(move || {
            for stream in listener.incoming().flatten() {
                let handler = handler.clone();
                std::thread::spawn(move || serve(stream, &*handler));
            }
        });
        Server { url }
    }
}

fn serve(mut stream: TcpStream, handler: &Handler) {
    let Some(request) = read(&mut stream) else { return };
    let Reply::Send { status, headers, body } = handler(request) else { return };
    let mut head = format!("HTTP/1.1 {status} Fake\r\nContent-Length: {}\r\nConnection: close\r\n", body.len());
    for (name, value) in headers {
        head.push_str(&format!("{name}: {value}\r\n"));
    }
    head.push_str("\r\n");
    let _ = stream.write_all(head.as_bytes()).and_then(|_| stream.write_all(&body));
}

fn read(stream: &mut TcpStream) -> Option<Request> {
    let mut reader = BufReader::new(stream);
    let mut line = String::new();
    reader.read_line(&mut line).ok()?;
    let mut parts = line.split_whitespace();
    let (method, target) = (parts.next()?.to_string(), parts.next()?.to_string());
    let mut headers = Vec::new();
    loop {
        let mut line = String::new();
        reader.read_line(&mut line).ok()?;
        let line = line.trim_end();
        if line.is_empty() {
            break;
        }
        let (name, value) = line.split_once(':')?;
        headers.push((name.trim().to_string(), value.trim().to_string()));
    }
    let length = headers.iter().find(|(name, _)| name.eq_ignore_ascii_case("content-length")).and_then(|(_, value)| value.parse().ok());
    let mut body = vec![0; length.unwrap_or(0)];
    reader.read_exact(&mut body).ok()?;
    let url = url::Url::parse(&format!("http://fake{target}")).ok()?;
    let query = url.query_pairs().into_owned().collect();
    Some(Request { method, path: url.path().to_string(), query, headers, body })
}
