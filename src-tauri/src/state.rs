use std::sync::{Arc, Mutex};

use crate::models::FileItem;

// Global state for file list (Arc allows cloning for async tasks)
pub struct FileListState(pub Arc<Mutex<Vec<FileItem>>>);
