use std::fs::File;
use std::path::PathBuf;
use std::time::SystemTime;

use tauri::{AppHandle, Runtime};

use crate::games_folder::DirEntry;

// Games folders here are always paths, so there is never a tree.
pub enum Tree<'a, R: Runtime> {
    _Never(std::convert::Infallible, std::marker::PhantomData<&'a AppHandle<R>>),
}

impl<'a, R: Runtime> Tree<'a, R> {
    fn never(&self) -> ! {
        match self {
            Tree::_Never(never, _) => match *never {},
        }
    }

    pub fn open(_app: &'a AppHandle<R>, _folder: &str) -> Option<Self> {
        None
    }

    pub async fn exists(&self) -> bool {
        self.never()
    }

    pub async fn keep(&self) -> Result<(), String> {
        self.never()
    }

    pub async fn create_dir(&self, _path: &str) -> Result<(), String> {
        self.never()
    }

    pub async fn read_dir(&self, _path: &str) -> Result<Vec<DirEntry>, String> {
        self.never()
    }

    pub async fn read(&self, _path: &str) -> Result<Vec<u8>, String> {
        self.never()
    }

    pub async fn open_file(&self, _path: &str) -> Result<File, String> {
        self.never()
    }

    pub async fn open_for_core(&self, _path: &str) -> Result<crate::rom::RomFile, String> {
        self.never()
    }

    pub fn unpack_dir(&self) -> Result<PathBuf, String> {
        self.never()
    }

    pub async fn stat(&self, _path: &str) -> Result<(u64, SystemTime), String> {
        self.never()
    }

    pub async fn write(&self, _path: &str, _contents: &[u8]) -> Result<(), String> {
        self.never()
    }

    pub fn writing_key(&self, _staged: &str) -> String {
        self.never()
    }

    pub async fn create_file(&self, _path: &str, _staged: &str) -> Result<(File, StagedTree<R>), String> {
        self.never()
    }

    pub async fn remove_file(&self, _path: &str) -> Result<(), String> {
        self.never()
    }

    pub async fn remove_dir(&self, _path: &str) -> Result<(), String> {
        self.never()
    }
}

pub enum StagedTree<R: Runtime> {
    _Never(std::convert::Infallible, std::marker::PhantomData<AppHandle<R>>),
}

impl<R: Runtime> StagedTree<R> {
    fn never(&self) -> ! {
        match self {
            StagedTree::_Never(never, _) => match *never {},
        }
    }

    pub async fn finish(&self) -> (Result<(), String>, bool) {
        self.never()
    }

    pub fn discard(self) {
        self.never()
    }
}
