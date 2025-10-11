use std::sync::Mutex;

use crate::models::FileItem;

// Global state for file list
pub struct FileListState(pub Mutex<Vec<FileItem>>);
