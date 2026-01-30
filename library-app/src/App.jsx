
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Users, Edit2, Library, Trash2, X, Plus, LayoutGrid, List, ChevronLeft, ChevronRight, RefreshCw, Check, AlertCircle, BarChart2, Moon, Sun, Download, Upload, Clock, FileText } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import './App.css';

// Firebase Imports
import { db } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, where, serverTimestamp, getDocs, writeBatch } from "firebase/firestore";
import * as XLSX from 'xlsx';

// Category definitions with colors
const CATEGORIES = [
  { id: '全部', label: '全部', color: '#8b5cf6' },
  { id: '新書-待借', label: '📚 新書-待借', color: '#3b82f6' },
  { id: '待借', label: '📖 待借', color: '#06b6d4' },
  { id: '未到館', label: '🚚 未到館', color: '#f59e0b' },
  { id: '不能借', label: '🚫 不能借', color: '#ef4444' },
  { id: '食譜', label: '🍳 食譜', color: '#10b981' },
  { id: '頁數太多', label: '📏 頁數太多', color: '#6366f1' },
  { id: '已看-3447本', label: '✅ 已看(主)', color: '#22c55e' },
  { id: '已看-1', label: '✅ 已看(1)', color: '#84cc16' },
];

// 借閱人顏色設定
const BORROWER_CONFIG = {
  'ELMO': { color: '#8b5cf6', bg: '#f3e8ff', label: '🟣 ELMO' },
  '妹': { color: '#ec4899', bg: '#fce7f3', label: '🩷 妹' },
  '妹(網路)': { color: '#be185d', bg: '#fce7f3', label: '🩷 妹(網路)' },
  '州家庭': { color: '#3b82f6', bg: '#dbeafe', label: '🔵 州家庭' },
  '州家庭(網路)': { color: '#1d4ed8', bg: '#dbeafe', label: '🔵 州家庭(網路)' },
  '州個人': { color: '#10b981', bg: '#d1fae5', label: '🟢 州個人' },
  '州個人(網路)': { color: '#047857', bg: '#d1fae5', label: '🟢 州個人(網路)' },
};

// 借閱人標籤組件
const BorrowerBadge = ({ text, onClick }) => {
  if (!text || text === '-' || text === '0') return <span style={{ color: '#ccc' }}>-</span>;

  const config = BORROWER_CONFIG[text];

  if (config) {
    return (
      <span
        className={`borrower-badge ${onClick ? 'clickable' : ''}`}
        style={{
          backgroundColor: config.bg,
          color: config.color,
          border: `1px solid ${config.color}30`
        }}
        onClick={onClick}
        title={onClick ? "點擊依此借閱人篩選" : ""}
      >
        {config.label.split(' ')[0]} {text}
      </span>
    );
  }

  if (text.includes('網路')) {
    return (
      <span
        className={`borrower-badge ${onClick ? 'clickable' : ''}`}
        style={{
          backgroundColor: '#ffedd5',
          color: '#c2410c',
          border: '1px solid #fdba74'
        }}
        onClick={onClick}
      >
        🌐 {text}
      </span>
    );
  }

  const isISBN = /^(978|979)?\d{9}[\dxX]$|^\d{9}[\dxX]$/.test(text.replace(/-/g, ''));
  if (isISBN) {
    return <span className="isbn-text">{text}</span>;
  }

  return (
    <span
      className={onClick ? "clickable-text" : ""}
      onClick={onClick}
      title={onClick ? "點擊依此備註篩選" : ""}
    >
      {text}
    </span>
  );
};

const StatsDashboard = ({ books, categories }) => {
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57', '#ffc0cb', '#4ade80'];

  const categoryData = useMemo(() => {
    return categories
      .filter(c => c.id !== '全部')
      .map(cat => ({
        name: cat.label.split(' ')[1] || cat.label,
        value: books.filter(b => b.category === cat.id).length,
        color: cat.color
      }))
      .filter(d => d.value > 0);
  }, [books, categories]);

  const authorData = useMemo(() => {
    const counts = {};
    books.forEach(b => {
      const author = b.author || '未分類作者';
      if (author !== '未分類作者') {
        counts[author] = (counts[author] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [books]);

  const borrowerData = useMemo(() => {
    const counts = {};
    books.forEach(b => {
      const note = b.note ? String(b.note).trim() : '';
      const isISBN = /^(978|979)?\d{9}[\dxX]$|^\d{9}[\dxX]$/.test(note);

      if (note && !isISBN) {
        counts[note] = (counts[note] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [books]);

  return (
    <div className="stats-dashboard animate-fade-in">
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Library size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{books.length.toLocaleString()}</span>
            <span className="stat-label">總藏書</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <Users size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{new Set(books.map(b => b.author)).size.toLocaleString()}</span>
            <span className="stat-label">作者總數</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <Plus size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-value">
              {books.filter(b => b.date === new Date().toISOString().split('T')[0]).length || '0'}
            </span>
            <span className="stat-label">今日新增</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
            <BarChart2 size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{categories.filter(c => c.id !== '全部').length}</span>
            <span className="stat-label">分類數</span>
          </div>
        </div>
      </div>

      <div className="charts-container">
        <div className="chart-wrapper">
          <h3>📖 書籍分類分佈</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-wrapper">
          <h3>🏆 Top 10 作者</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={authorData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]}>
                  {authorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="chart-wrapper">
        <h3>👥 Top 10 借閱人</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={borrowerData} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
              <RechartsTooltip />
              <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]}>
                {borrowerData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const ActivityLog = ({ activities, stats, onRefresh, onClear }) => {
  const getActionIcon = (action) => {
    switch (action) {
      case 'add': return '➕';
      case 'edit': return '✏️';
      case 'delete': return '🗑️';
      case 'category_change': return '📁';
      default: return '📝';
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case 'add': return '新增書籍';
      case 'edit': return '編輯書籍';
      case 'delete': return '刪除書籍';
      case 'category_change': return '變更分類';
      default: return '操作';
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'add': return '#10b981';
      case 'edit': return '#3b82f6';
      case 'delete': return '#ef4444';
      case 'category_change': return '#f59e0b';
      default: return '#8b5cf6';
    }
  };

  const formatFieldName = (field) => {
    const fieldMap = {
      'title': '書名',
      'author': '作者',
      'date': '日期',
      'note': '備註',
      'category': '分類'
    };
    return fieldMap[field] || field;
  };

  return (
    <div className="activity-log animate-fade-in">
      <div className="activity-stats-cards">
        <div className="activity-stat-card">
          <div className="activity-stat-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
            <FileText size={24} />
          </div>
          <div className="activity-stat-info">
            <span className="activity-stat-value">{stats?.total || 0}</span>
            <span className="activity-stat-label">今日總操作</span>
          </div>
        </div>
        <div className="activity-stat-card">
          <div className="activity-stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <Plus size={24} />
          </div>
          <div className="activity-stat-info">
            <span className="activity-stat-value">{stats?.adds || 0}</span>
            <span className="activity-stat-label">新增</span>
          </div>
        </div>
        <div className="activity-stat-card">
          <div className="activity-stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
            <Edit2 size={24} />
          </div>
          <div className="activity-stat-info">
            <span className="activity-stat-value">{stats?.edits || 0}</span>
            <span className="activity-stat-label">編輯</span>
          </div>
        </div>
        <div className="activity-stat-card">
          <div className="activity-stat-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
            <Trash2 size={24} />
          </div>
          <div className="activity-stat-info">
            <span className="activity-stat-value">{stats?.deletes || 0}</span>
            <span className="activity-stat-label">刪除</span>
          </div>
        </div>
      </div>

      <div className="activity-actions">
      </div>

      <div className="activity-list">
        {activities.length === 0 && (
          <div className="activity-empty">
            <Clock size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3>今日尚無活動記錄</h3>
            <p>當您新增、編輯或刪除書籍時，記錄會顯示在這裡</p>
          </div>
        )}

        {activities.map((activity, index) => (
          <div
            key={activity.id || index}
            className="activity-item"
            style={{ '--activity-color': getActionColor(activity.action) }}
          >
            <div className="activity-timeline">
              <div className="activity-dot" style={{ background: getActionColor(activity.action) }}></div>
              {index < activities.length - 1 && <div className="activity-line"></div>}
            </div>

            <div className="activity-content">
              <div className="activity-header">
                <span className="activity-icon">{getActionIcon(activity.action)}</span>
                <span className="activity-action" style={{ color: getActionColor(activity.action) }}>
                  {getActionLabel(activity.action)}
                </span>
                <span className="activity-time">
                  <Clock size={14} style={{ marginRight: '4px' }} />
                  {activity.time}
                </span>
              </div>

              <div className="activity-book-info">
                <div className="activity-book-title">{activity.book_title}</div>
                {activity.book_author && activity.book_author !== '未分類作者' && (
                  <div className="activity-book-author">作者: {activity.book_author}</div>
                )}
              </div>

              {activity.action === 'category_change' && activity.details && (
                <div className="activity-changes">
                  <span className="change-badge old">{activity.details.old_category}</span>
                  <span className="change-arrow">→</span>
                  <span className="change-badge new">{activity.details.new_category}</span>
                </div>
              )}

              {activity.action === 'edit' && activity.details?.changes?.length > 0 && (
                <div className="activity-changes">
                  {activity.details.changes.map((change, i) => (
                    <div key={i} className="change-row">
                      <span className="change-field">{formatFieldName(change.field)}:</span>
                      <span className="change-old">{change.old || '(空)'}</span>
                      <span className="change-arrow">→</span>
                      <span className="change-new">{change.new || '(空)'}</span>
                    </div>
                  ))}
                </div>
              )}

              {activity.action === 'add' && (
                <div className="activity-category-badge" style={{ background: getActionColor('add') }}>
                  {activity.book_category}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ITEMS_PER_PAGE = 50;

function App() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [sortBy, setSortBy] = useState('date_desc');
  const [viewMode, setViewMode] = useState('table');
  const [currentPage, setCurrentPage] = useState(1);

  // Add Book Modal State
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    title: '',
    author: '',
    date: '',
    note: '',
    category: '新書-待借'
  });

  const BORROWERS = ['州家庭', '妹', '妹(網路)', '州家庭(網路)', '州個人', '州個人(網路)'];
  const [customBorrower, setCustomBorrower] = useState('');

  // 活動記錄狀態
  const [activities, setActivities] = useState([]);
  const [activityStats, setActivityStats] = useState({});

  // 刪除確認對話框狀態
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, bookId: null, bookTitle: '' });

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('library-theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('library-theme', theme);
  }, [theme]);

  // Sanitize title for search
  const sanitizeForSearch = (title) => {
    if (!title) return '';
    let s = String(title).replace(/[\(（].*?[\)）]/g, '');
    s = s.split(/[:：]/)[0];
    s = s.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ');
    return s.replace(/\s+/g, ' ').trim();
  };

  // 🔥 Fetch books from Firestore (Real-time)
  useEffect(() => {
    setLoading(true);
    // 訂閱 'books' 集合
    const q = query(collection(db, 'books')); // 可以加 orderBy
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const booksData = [];
      snapshot.forEach((doc) => {
        // 合併 doc.id 和數據 (雖然我們數據裡已經有 id 欄位，但使用 doc.id 更安全)
        booksData.push({ ...doc.data(), docId: doc.id });
      });
      setBooks(booksData);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError("無法連接雲端資料庫");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 🔥 Fetch activities from Firestore (Real-time)
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    console.log('Fetching activities for date:', today);

    // 只獲取今天的活動
    const q = query(
      collection(db, 'activities'),
      where('date', '==', today),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const acts = [];
      let adds = 0, edits = 0, deletes = 0, category_changes = 0;

      snapshot.forEach(doc => {
        const act = doc.data();
        acts.push(act);
        if (act.action === 'add') adds++;
        if (act.action === 'edit') edits++;
        if (act.action === 'delete') deletes++;
        if (act.action === 'category_change') category_changes++;
      });

      console.log('Activities loaded:', acts.length);
      setActivities(acts);
      setActivityStats({
        total: acts.length,
        adds, edits, deletes, category_changes
      });
    }, (err) => {
      console.error('Activity query error:', err);
      // If index error, try simpler query without orderBy
      if (err.code === 'failed-precondition') {
        console.log('Index not ready, trying simpler query...');
        const simpleQ = query(
          collection(db, 'activities'),
          where('date', '==', today)
        );
        onSnapshot(simpleQ, (snapshot) => {
          const acts = [];
          let adds = 0, edits = 0, deletes = 0, category_changes = 0;
          snapshot.forEach(doc => {
            const act = doc.data();
            acts.push(act);
            if (act.action === 'add') adds++;
            if (act.action === 'edit') edits++;
            if (act.action === 'delete') deletes++;
            if (act.action === 'category_change') category_changes++;
          });
          // Sort client-side
          acts.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
          setActivities(acts);
          setActivityStats({ total: acts.length, adds, edits, deletes, category_changes });
        });
      }
    });

    return () => unsubscribe();
  }, []); // 移除 viewMode 依賴，讓訂閱一直保持

  // Log Activity Helper
  const logActivity = async (action, bookData, oldData = null) => {
    try {
      const now = new Date();
      const activityData = {
        timestamp: now.toISOString().replace('T', ' ').split('.')[0],
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('en-US', { hour12: false }),
        action,
        book_id: bookData.id || bookData.docId, // Use available ID
        book_title: bookData.title,
        book_author: bookData.author,
        book_category: bookData.category,
        details: {}
      };

      if (action === 'edit' && oldData) {
        const changes = [];
        ['title', 'author', 'date', 'note', 'category'].forEach(key => {
          if (bookData[key] !== oldData[key]) {
            changes.push({ field: key, old: oldData[key], new: bookData[key] });
          }
        });
        activityData.details.changes = changes;
      }

      if (action === 'category_change' && oldData) {
        activityData.details.old_category = oldData.category;
        activityData.details.new_category = bookData.category;
      }

      await addDoc(collection(db, 'activities'), activityData);
    } catch (e) {
      console.error("Failed to log activity", e);
    }
  };

  // 離開頁面警告
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (editingId !== null) {
        e.preventDefault();
        e.returnValue = '您有未完成的編輯，確定要離開嗎？';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [editingId]);

  // Derived Stats
  const categoryStats = useMemo(() => {
    const stats = {};
    CATEGORIES.forEach(cat => {
      stats[cat.id] = cat.id === '全部'
        ? books.length
        : books.filter(b => b.category === cat.id).length;
    });
    return stats;
  }, [books]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeCategory, sortBy]);

  const startEdit = (book) => {
    setEditingId(book.docId); // Use Firestore Doc ID for tracking editing
    setEditForm({ ...book });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (exitEditMode = true) => {
    setSaving(true);
    try {
      const bookRef = doc(db, 'books', editingId);
      // Find original book data for activity log
      const oldBook = books.find(b => b.docId === editingId);

      await updateDoc(bookRef, {
        title: editForm.title,
        author: editForm.author,
        date: editForm.date,
        note: editForm.note,
        category: editForm.category
      });

      // Log Activity
      if (oldBook) {
        if (oldBook.category !== editForm.category) {
          await logActivity('category_change', editForm, oldBook);
        } else {
          await logActivity('edit', editForm, oldBook);
        }
      }

      if (exitEditMode) {
        setEditingId(null);
      }
      setLastSaved(new Date());
    } catch (err) {
      alert('儲存失敗: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldBlur = () => {
    if (editingId !== null) {
      saveEdit(false);
    }
  };

  const handleFieldKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveEdit(true);
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const requestDeleteBook = (book) => {
    setDeleteConfirm({ open: true, bookId: book.docId, bookTitle: book.title });
  };

  const confirmDeleteBook = async () => {
    const docId = deleteConfirm.bookId;
    // Find book for log
    const deletedBook = books.find(b => b.docId === docId);

    setDeleteConfirm({ open: false, bookId: null, bookTitle: '' });
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'books', docId));
      if (deletedBook) {
        await logActivity('delete', deletedBook);
      }
      setLastSaved(new Date());
    } catch (err) {
      alert('刪除失敗: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelDeleteBook = () => {
    setDeleteConfirm({ open: false, bookId: null, bookTitle: '' });
  };

  const handleChange = (e, field) => {
    setEditForm({ ...editForm, [field]: e.target.value });
  };

  const handleQuickFilter = (text) => {
    if (!text || text === '-' || text === '未分類作者') return;
    setSearchTerm(text);
  };

  const handleQuickCategoryChange = async (book, newCategory) => {
    if (book.category === newCategory) return;
    setSaving(true);
    try {
      const bookRef = doc(db, 'books', book.docId);
      const updatedData = { ...book, category: newCategory };
      await updateDoc(bookRef, { category: newCategory });

      await logActivity('category_change', updatedData, book);

      setLastSaved(new Date());
    } catch (err) {
      alert('切換分類失敗: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addNewBook = () => {
    const today = new Date().toISOString().split('T')[0];
    setAddForm({
      title: '',
      author: '未分類作者',
      date: today,
      note: '',
      category: activeCategory === '全部' ? '新書-待借' : activeCategory
    });
    setCustomBorrower('');
    setAddModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.title) return;
    setSaving(true);
    try {
      const noteToSave = addForm.note === 'Other' ? customBorrower : addForm.note;

      // Generate ID: Use Date.now() as simple numeric ID for compatibility
      const newId = Date.now();

      const newBook = {
        ...addForm,
        note: noteToSave,
        id: newId,
        created_at: serverTimestamp()
      };

      // Add to Firestore (Letting Firestore generate Document ID, but we store internal numeric ID too)
      await addDoc(collection(db, 'books'), newBook);

      await logActivity('add', newBook);

      setLastSaved(new Date());
      setAddModalOpen(false);
    } catch (err) {
      alert('新增失敗: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const fileInputRef = React.useRef(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm(`確定要從 "${file.name}" 匯入資料嗎？\n注意：這將會新增不存在的書籍，並更新 ID 相同的書籍。`)) {
      e.target.value = ''; // Reset
      return;
    }

    setSaving(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error("檔案內容為空");
      }

      console.log(`Reading ${jsonData.length} rows...`);

      // Batch processing
      const BATCH_SIZE = 400;
      let batch = writeBatch(db);
      let count = 0;
      let totalProcessed = 0;

      // Scan existing internal IDs to map to Doc IDs
      // This is expensive for client-side huge lists, but necessary for Update.
      // Optimally, we query ONLY if we need update. 
      // For simplicity/safety in this web version: 
      // We will try to match by 'id' field if possible.
      // But querying 5000 IDs is slow.
      // Alternative: We just Add new docs if we can't easily find them?
      // No, that creates duplicates.

      // Better strategy for Web Import:
      // Download ALL existing minimal data (id, docId) first?
      // We already have `books` state! It contains all current books with docId.
      // PERFECT. We can use local `books` state for collision detection.

      const idMap = new Map();
      books.forEach(b => {
        if (b.id) idMap.set(String(b.id), b.docId);
      });

      for (const row of jsonData) {
        const sysId = row['系統ID'] || row['id'] || (Date.now() + count); // Fallback ID
        const sysIdStr = String(sysId);

        const bookData = {
          id: sysId,
          title: String(row['書名'] || row['title'] || ''),
          author: String(row['作者'] || row['author'] || '未分類作者'),
          category: String(row['分類'] || row['category'] || '新書-待借'),
          note: String(row['借閱人_備註'] || row['借閱人'] || row['note'] || ''),
          date: String(row['日期'] || row['date'] || '')
        };

        // Date cleanup
        if (bookData.date === 'undefined') bookData.date = '';

        let docRef;
        if (idMap.has(sysIdStr)) {
          // Update existing
          const docId = idMap.get(sysIdStr);
          docRef = doc(db, 'books', docId);
        } else {
          // Create new
          docRef = doc(collection(db, 'books'));
        }

        batch.set(docRef, bookData, { merge: true });
        count++;
        totalProcessed++;

        if (count >= BATCH_SIZE) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
          console.log(`Processed ${totalProcessed} records...`);
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      alert(`匯入成功！共處理 ${jsonData.length} 筆資料。`);
      setLastSaved(new Date());

    } catch (err) {
      console.error(err);
      alert("匯入失敗: " + err.message);
    } finally {
      setSaving(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleExport = () => {
    try {
      // 準備資料
      const data = books.map(book => ({
        '系統ID': book.id,
        '分類': book.category,
        '書名': book.title,
        '作者': book.author,
        '借閱人_備註': book.note,
        '日期': book.date,
        '建立時間': book.created_at ? new Date(book.created_at.seconds * 1000).toLocaleString() : ''
      }));

      // 建立工作表
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "圖書館清單");

      // 下載檔案
      const filename = `圖書館借書清單_雲端匯出_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Export failed:", err);
      alert("匯出失敗: " + err.message);
    }
  };

  // Filtered and sorted
  const filteredBooks = useMemo(() => {
    let result = books.filter(book => {
      const matchesSearch =
        book.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.note?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        activeCategory === '全部' || book.category === activeCategory;
      return matchesSearch && matchesCategory;
    });

    result.sort((a, b) => {
      if (sortBy === 'added') {
        // Sort by ID (numeric) desc or created_at
        // Using ID for now as it maps to "Added Order" roughly
        return (b.id || 0) - (a.id || 0); // Newer (larger ID) first
      }
      if (sortBy === 'date_desc') {
        if (!a.date) return 1; if (!b.date) return -1;
        return b.date.localeCompare(a.date);
      }
      if (sortBy === 'date_asc') {
        if (!a.date) return 1; if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      }
      if (sortBy === 'author') {
        if (a.author === '未分類作者' && b.author !== '未分類作者') return 1;
        if (a.author !== '未分類作者' && b.author === '未分類作者') return -1;
        const cmp = (a.author || '').localeCompare(b.author || '', 'zh-TW-u-co-stroke');
        if (cmp !== 0) return cmp;
        return (a.title || '').localeCompare(b.title || '', 'zh-TW-u-co-stroke');
      }
      return (a.title || '').localeCompare(b.title || '', 'zh-TW-u-co-stroke');
    });

    return result;
  }, [books, searchTerm, activeCategory, sortBy]);

  const totalPages = Math.ceil(filteredBooks.length / ITEMS_PER_PAGE);
  const paginatedBooks = filteredBooks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getCategoryColor = (catId) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    return cat ? cat.color : '#64748b';
  };

  return (
    <div className="app-container">
      {/* 標題與搜尋欄 */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">
              <Library size={32} color="white" />
            </div>
            <h1>圖書館借書管理 <span className="cloud-badge">雲端版</span></h1>
          </div>

          <div className="header-actions">
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".xlsx,.xls"
              onChange={handleFileChange}
            />
            <button className="theme-toggle" onClick={handleImportClick} title="上傳 Excel 匯入">
              <Upload size={20} /> <span className="btn-text">上傳</span>
            </button>
            <button className="theme-toggle" onClick={handleExport} title="下載 Excel">
              <Download size={20} /> <span className="btn-text">下載</span>
            </button>
            <button className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="切換深色/淺色模式">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <div className="search-box">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                placeholder="搜尋書名、作者或備註..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="clear-search" onClick={() => setSearchTerm('')}>
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 統計面板 / 工具列 */}
      <div className="toolbar">
        <div className="categories">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
              style={{ '--cat-color': cat.color }}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
              <span className="count-badge">{categoryStats[cat.id]}</span>
            </button>
          ))}
        </div>

        <div className="view-toggles">
          <button
            className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            <List size={18} /> 列表
          </button>
          <button
            className={`view-btn ${viewMode === 'card' ? 'active' : ''}`}
            onClick={() => setViewMode('card')}
          >
            <LayoutGrid size={18} /> 卡片
          </button>
          <button
            className={`view-btn ${viewMode === 'activity' ? 'active' : ''}`}
            onClick={() => setViewMode('activity')}
          >
            <Clock size={18} /> 今日活動
          </button>
          <button
            className={`view-btn ${viewMode === 'stats' ? 'active' : ''}`}
            onClick={() => setViewMode('stats')}
          >
            <BarChart2 size={18} /> 統計
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-controls">
          <div className="control-left">
            <span className="book-count">顯示 {filteredBooks.length} 本書籍</span>
            {lastSaved && (
              <span className="save-status">
                <Check size={14} /> 雲端已同步 ({lastSaved.toLocaleTimeString()})
              </span>
            )}
            {saving && <span className="saving-indicator">儲存中...</span>}
          </div>

          <div className="control-right">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sort-select">
              <option value="added">依加入時間 (最新在先)</option>
              <option value="date_desc">依日期 (最新在先)</option>
              <option value="date_asc">依日期 (最舊在先)</option>
              <option value="author">依作者筆畫排序</option>
              <option value="title">依書名筆畫排序</option>
            </select>

            <button className="btn-primary add-btn" onClick={addNewBook}>
              <Plus size={20} /> 新增書籍
            </button>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <RefreshCw size={40} className="spin" />
            <p>正在載入雲端書庫...</p>
          </div>
        ) : viewMode === 'stats' ? (
          <StatsDashboard books={books} categories={CATEGORIES} />
        ) : viewMode === 'activity' ? (
          <ActivityLog
            activities={activities}
            stats={activityStats}
            onRefresh={() => { }} // Snapshot updates auto
            onClear={() => { }} // Not implemented for firestore yet to avoid accidental wipes
          />
        ) : (
          /* Table/Card View */
          <>
            {viewMode === 'table' ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th width="60">ID</th>
                      <th width="120">分類</th>
                      <th width="250">書名</th>
                      <th width="150">作者</th>
                      <th width="150">借閱人/備註</th>
                      <th width="120">日期</th>
                      <th width="120">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBooks.map(book => (
                      <tr key={book.docId} className={editingId === book.docId ? 'editing-row' : ''} onDoubleClick={() => startEdit(book)}>
                        <td>{book.id}</td>
                        <td>
                          {editingId === book.docId ? (
                            <select
                              value={editForm.category}
                              onChange={(e) => handleChange(e, 'category')}
                              onBlur={handleFieldBlur}
                              onKeyDown={handleFieldKeyDown}
                              autoFocus
                            >
                              {CATEGORIES.filter(c => c.id !== '全部').map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                              ))}
                            </select>
                          ) : (
                            <select
                              className="category-select"
                              style={{ backgroundColor: getCategoryColor(book.category), color: 'white' }}
                              value={book.category}
                              onChange={(e) => handleQuickCategoryChange(book, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {CATEGORIES.filter(c => c.id !== '全部').map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td>
                          {editingId === book.docId ? (
                            <input
                              type="text"
                              value={editForm.title}
                              onChange={(e) => handleChange(e, 'title')}
                              onBlur={handleFieldBlur}
                              onKeyDown={handleFieldKeyDown}
                            />
                          ) : (
                            <span className="book-title">{book.title}</span>
                          )}
                        </td>
                        <td>
                          {editingId === book.docId ? (
                            <input
                              type="text"
                              value={editForm.author}
                              onChange={(e) => handleChange(e, 'author')}
                              onBlur={handleFieldBlur}
                              onKeyDown={handleFieldKeyDown}
                            />
                          ) : (
                            <span
                              className="clickable-text"
                              onClick={() => handleQuickFilter(book.author)}
                              title="篩選此作者"
                            >
                              {book.author}
                            </span>
                          )}
                        </td>
                        <td>
                          {editingId === book.docId ? (
                            <input
                              type="text"
                              value={editForm.note}
                              onChange={(e) => handleChange(e, 'note')}
                              onBlur={handleFieldBlur}
                              onKeyDown={handleFieldKeyDown}
                            />
                          ) : (
                            <BorrowerBadge text={book.note} onClick={() => handleQuickFilter(book.note)} />
                          )}
                        </td>
                        <td>
                          {editingId === book.docId ? (
                            <input
                              type="text"
                              value={editForm.date}
                              onChange={(e) => handleChange(e, 'date')}
                              onBlur={handleFieldBlur}
                              onKeyDown={handleFieldKeyDown}
                              placeholder="YYYY-MM-DD"
                            />
                          ) : (
                            book.date
                          )}
                        </td>
                        <td>
                          {editingId === book.docId ? (
                            <div className="action-buttons">
                              <button className="icon-btn save" onClick={() => saveEdit(true)}><Check size={18} /></button>
                              <button className="icon-btn cancel" onClick={cancelEdit}><X size={18} /></button>
                            </div>
                          ) : (
                            <div className="action-buttons">
                              <button className="icon-btn edit" onClick={() => startEdit(book)}><Edit2 size={18} /></button>
                              <button className="icon-btn delete" onClick={() => requestDeleteBook(book)}><Trash2 size={18} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="cards-grid">
                {paginatedBooks.map(book => (
                  <div key={book.docId} className="book-card" style={{ borderTop: `4px solid ${getCategoryColor(book.category)}` }}>
                    <div className="card-content">
                      <div className="card-header">
                        <span className="card-id">#{book.id}</span>
                        <span className="card-category" style={{ color: getCategoryColor(book.category) }}>{book.category}</span>
                      </div>
                      <h3 className="card-title" title={book.title}>{book.title}</h3>
                      <div className="card-meta">
                        <div className="meta-row"><Users size={14} /> {book.author}</div>
                        <div className="meta-row"><Clock size={14} /> {book.date || '-'}</div>
                        {book.note && <div className="meta-row note"><FileText size={14} /> <BorrowerBadge text={book.note} /></div>}
                      </div>
                    </div>
                    <div className="card-actions">
                      <button className="icon-btn edit" onClick={() => startEdit(book)}><Edit2 size={16} /></button>
                      <button className="icon-btn delete" onClick={() => requestDeleteBook(book)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={20} /> 首頁
                </button>
                <span className="page-info">第 {currentPage} / {totalPages} 頁</span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  下一頁 <ChevronRight size={20} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                >
                  末頁
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Add Book Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>新增書籍</h2>
              <button className="close-btn" onClick={() => setAddModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label>書名</label>
                <input
                  type="text"
                  value={addForm.title}
                  onChange={e => setAddForm({ ...addForm, title: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>分類</label>
                <select
                  value={addForm.category}
                  onChange={e => setAddForm({ ...addForm, category: e.target.value })}
                >
                  {CATEGORIES.filter(c => c.id !== '全部').map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group two-col">
                <div>
                  <label>作者</label>
                  <input
                    type="text"
                    value={addForm.author}
                    onChange={e => setAddForm({ ...addForm, author: e.target.value })}
                  />
                </div>
                <div>
                  <label>日期</label>
                  <input
                    type="text"
                    value={addForm.date}
                    onChange={e => setAddForm({ ...addForm, date: e.target.value })}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>借閱人 / 備註</label>
                <select
                  value={BORROWERS.includes(addForm.note) ? addForm.note : (addForm.note ? 'Other' : '')}
                  onChange={e => {
                    const val = e.target.value;
                    setAddForm({ ...addForm, note: val });
                    if (val === 'Other') setCustomBorrower('');
                  }}
                  style={{ marginBottom: '8px' }}
                >
                  <option value="">(無)</option>
                  {BORROWERS.map(b => <option key={b} value={b}>{b}</option>)}
                  <option value="Other">自行輸入 / ISBN</option>
                </select>

                {(addForm.note === 'Other' || (!BORROWERS.includes(addForm.note) && addForm.note)) && (
                  <input
                    type="text"
                    placeholder="輸入借閱人名稱或 ISBN"
                    value={addForm.note === 'Other' ? customBorrower : addForm.note}
                    onChange={e => {
                      setCustomBorrower(e.target.value);
                      setAddForm({ ...addForm, note: 'Other' });
                    }}
                  />
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setAddModalOpen(false)}>取消</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? '新增中...' : '確認新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm.open && (
        <div className="modal-overlay">
          <div className="modal-content confirm-modal">
            <div className="modal-header">
              <h2>確認刪除</h2>
            </div>
            <p>您確定要刪除書籍 <strong>{deleteConfirm.bookTitle}</strong> 嗎？</p>
            <p className="sub-text">此動作無法復原。</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={cancelDeleteBook}>取消</button>
              <button className="btn-danger" onClick={confirmDeleteBook} disabled={saving}>
                {saving ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
