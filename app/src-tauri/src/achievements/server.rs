use super::ffi::{rc_api_request_t, rc_api_server_response_t, RC_API_SERVER_RESPONSE_RETRYABLE_CLIENT_ERROR};
use reqwest::header::{CONTENT_TYPE, USER_AGENT};
use reqwest::Client;
use std::ffi::{c_char, c_int, CStr};

pub struct Request {
    pub url: String,
    pub post: Option<String>,
    pub content_type: Option<String>,
}

unsafe fn text(text: *const c_char) -> Option<String> {
    (!text.is_null()).then(|| CStr::from_ptr(text).to_string_lossy().into_owned())
}

impl Request {
    pub unsafe fn from(request: &rc_api_request_t) -> Request {
        Request {
            url: text(request.url).unwrap_or_default(),
            post: text(request.post_data),
            content_type: text(request.content_type),
        }
    }
}

pub struct Answer {
    pub status: c_int,
    pub body: Vec<u8>,
}

impl Answer {
    fn unanswered() -> Answer {
        Answer { status: RC_API_SERVER_RESPONSE_RETRYABLE_CLIENT_ERROR, body: Vec::new() }
    }

    pub fn raw(&self) -> rc_api_server_response_t {
        rc_api_server_response_t {
            body: self.body.as_ptr() as *const c_char,
            body_length: self.body.len(),
            http_status_code: self.status,
        }
    }

    pub fn without_remaining(&mut self) {
        if let Ok(serde_json::Value::Object(mut answer)) = serde_json::from_slice(&self.body) {
            answer.remove("AchievementsRemaining");
            self.body = serde_json::to_vec(&answer).unwrap_or_default();
        }
    }

    /// Whether RetroAchievements answered for good, as rcheevos counts it: it retries the rest.
    pub fn is_final(&self) -> bool {
        self.status > 0 && !matches!(self.status, 429 | 502..=504 | 521..=525)
    }
}

pub async fn send(http: &Client, user_agent: &str, request: &Request) -> Answer {
    let builder = match &request.post {
        Some(post) => http.post(&request.url).body(post.clone()),
        None => http.get(&request.url),
    };
    let builder = match &request.content_type {
        Some(content_type) => builder.header(CONTENT_TYPE, content_type),
        None => builder,
    };
    let response = match builder.header(USER_AGENT, user_agent).send().await {
        Ok(response) => response,
        Err(e) => {
            eprintln!("retroachievements: {e}");
            return Answer::unanswered();
        }
    };
    let status = response.status().as_u16() as c_int;
    match response.bytes().await {
        Ok(body) => Answer { status, body: body.to_vec() },
        Err(e) => {
            eprintln!("retroachievements: {e}");
            Answer::unanswered()
        }
    }
}
