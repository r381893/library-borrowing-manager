import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Users, Edit2, Library, Trash2, X, Plus, LayoutGrid, List, ChevronLeft, ChevronRight, RefreshCw, Check, AlertCircle, BarChart2, Moon, Sun, Download, Clock, FileText } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import './App.css';

// API Base URL - localhost for development, relative for production
const API_URL = import.meta.env.DEV ? 'http://localhost:5001/api' : '/api';

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

  // 如果在設定中有找到，顯示為 Badge
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

  // 自動判斷：如果包含 "網路"，顯示為橘色系 Badge
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

  // 預設純文字顯示 (但如果是 ISBN 格式，則保持原樣)
  const isISBN = /^(978|979)?\d{9}[\dxX]$|^\d{9}[\dxX]$/.test(text.replace(/-/g, ''));
  if (isISBN) {
    return <span className="isbn-text">{text}</span>;
  }

  // 其他備註文字
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
        name: cat.label.split(' ')[1] || cat.label, // 移除 emoji
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
      // Exclude empty notes and likely ISBNs (simple check for mostly digits 10-13 chars)
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
      {/* 總覽卡片 */}
      <div className="stats-cards">
        <div className="stat-card">
          <h3>📚 總藏書</h3>
          <p className="stat-value">{books.length}</p>
        </div>
        <div className="stat-card">
          <h3>✍️ 作者總數</h3>
          <p className="stat-value">{new Set(books.map(b => b.author)).size}</p>
        </div>
        <div className="stat-card">
          <h3>📅 今日新增</h3>
          <p className="stat-value">
            {books.filter(b => b.date === new Date().toISOString().split('T')[0]).length || '-'}
          </p>
        </div>
      </div>

      <div className="charts-container">
        {/* 分類分佈 */}
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

        {/* Top 10 作者 */}
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

      {/* Top 10 借閱人 */}
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

// 今日活動記錄組件
const ActivityLog = ({ activities, stats, onRefresh, onClear, loading }) => {
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
      {/* 統計卡片 */}
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

      {/* 操作按鈕 */}
      <div className="activity-actions">
        <button className="btn-secondary" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={18} className={loading ? 'spin' : ''} style={{ marginRight: '6px' }} />
          刷新記錄
        </button>
        {activities.length > 0 && (
          <button
            className="btn-secondary"
            onClick={() => {
              if (window.confirm('確定要清除所有今日活動記錄嗎？')) {
                onClear();
              }
            }}
            style={{ color: '#ef4444', borderColor: '#ef4444' }}
          >
            <Trash2 size={18} style={{ marginRight: '6px' }} />
            清除記錄
          </button>
        )}
      </div>

      {/* 活動記錄列表 */}
      <div className="activity-list">
        {loading && (
          <div className="activity-loading">
            <RefreshCw size={32} className="spin" style={{ color: 'var(--primary)' }} />
            <p>載入活動記錄中...</p>
          </div>
        )}

        {!loading && activities.length === 0 && (
          <div className="activity-empty">
            <Clock size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3>今日尚無活動記錄</h3>
            <p>當您新增、編輯或刪除書籍時，記錄會顯示在這裡</p>
          </div>
        )}

        {!loading && activities.map((activity, index) => (
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

              {/* 變更細節 */}
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
  const [sortBy, setSortBy] = useState('date_desc'); // 預設依日期 (最新在先)面)
  const [viewMode, setViewMode] = useState('table');
  // Helper: Sanitize title for search (preserve spaces)
  const sanitizeForSearch = (title) => {
    if (!title) return '';
    // 1. Remove content in parentheses
    let s = String(title).replace(/[\(（].*?[\)）]/g, '');
    // 2. Take part before colon
    s = s.split(/[:：]/)[0];
    // 3. Replace special chars with space (instead of removing them)
    s = s.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ');
    // 4. Collapse spaces
    return s.replace(/\s+/g, ' ').trim();
  };

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
  const [activityLoading, setActivityLoading] = useState(false);

  // 刪除確認對話框狀態
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, bookId: null, bookTitle: '' });

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('library-theme') || 'light';
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('library-theme', theme);
  }, [theme]);

  // Fetch books from API
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/books`);
      if (!res.ok) throw new Error('無法連接到伺服器');
      const data = await res.json();
      setBooks(data);
    } catch (err) {
      setError(err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch activities from API
  const fetchActivities = useCallback(async () => {
    setActivityLoading(true);
    try {
      const res = await fetch(`${API_URL}/activities`);
      if (!res.ok) throw new Error('無法取得活動記錄');
      const data = await res.json();
      setActivities(data.activities || []);
      setActivityStats(data.stats || {});
    } catch (err) {
      console.error('Fetch activities error:', err);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  // Clear activities
  const clearActivities = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/activities`, { method: 'DELETE' });
      if (res.ok) {
        setActivities([]);
        setActivityStats({});
      }
    } catch (err) {
      console.error('Clear activities error:', err);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // 當切換到活動分頁時自動載入活動記錄
  useEffect(() => {
    if (viewMode === 'activity') {
      fetchActivities();
    }
  }, [viewMode, fetchActivities]);

  // 🚨 離開頁面警告：編輯中離開會提醒
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

  // Stats per category
  const categoryStats = useMemo(() => {
    const stats = {};
    CATEGORIES.forEach(cat => {
      stats[cat.id] = cat.id === '全部'
        ? books.length
        : books.filter(b => b.category === cat.id).length;
    });
    return stats;
  }, [books]);

  // Author stats
  const totalAuthors = useMemo(() => {
    const authors = new Set(books.map(b => b.author).filter(a => a && a !== '未分類作者'));
    return authors.size;
  }, [books]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeCategory, sortBy]);

  const startEdit = (book) => {
    setEditingId(book.id);
    setEditForm({ ...book });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (exitEditMode = true) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/books/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) throw new Error('儲存失敗');

      setBooks(books.map(b => b.id === editingId ? { ...editForm } : b));
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

  // 自動儲存：當離開輸入框時觸發
  const handleFieldBlur = () => {
    if (editingId !== null) {
      saveEdit(false); // 儲存但不離開編輯模式
    }
  };

  // 按 Enter 鍵儲存並離開編輯模式
  const handleFieldKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveEdit(true);
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // 請求刪除（顯示確認對話框）
  const requestDeleteBook = (book) => {
    setDeleteConfirm({ open: true, bookId: book.id, bookTitle: book.title });
  };

  // 確認刪除（執行刪除）
  const confirmDeleteBook = async () => {
    const bookId = deleteConfirm.bookId;
    setDeleteConfirm({ open: false, bookId: null, bookTitle: '' });

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/books/${bookId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('刪除失敗');

      setBooks(books.filter(b => b.id !== bookId));
      setLastSaved(new Date());
    } catch (err) {
      alert('刪除失敗: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 取消刪除
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

  // 快速切換分類 (不需進入編輯模式，直接儲存)
  const handleQuickCategoryChange = async (book, newCategory) => {
    if (book.category === newCategory) return;

    setSaving(true);
    try {
      const updatedBook = { ...book, category: newCategory };
      const res = await fetch(`${API_URL}/books/${book.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBook)
      });
      if (!res.ok) throw new Error('儲存失敗');

      setBooks(books.map(b => b.id === book.id ? updatedBook : b));
      setLastSaved(new Date());
    } catch (err) {
      alert('切換分類失敗: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    window.open(`${API_URL}/export`, '_blank');
  };

  const handleForceRefresh = async () => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/debug/reload`, { method: 'POST' });
      await fetchBooks();
    } catch (err) {
      console.error(err);
      fetchBooks();
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
      // Use custom borrower if "Other" or typed
      const noteToSave = addForm.note === 'Other' ? customBorrower : addForm.note;

      const newBook = {
        ...addForm,
        note: noteToSave
      };

      const res = await fetch(`${API_URL}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBook)
      });

      if (!res.ok) throw new Error('新增失敗');

      const savedBook = await res.json();
      setBooks([savedBook, ...books]);
      setLastSaved(new Date());
      setAddModalOpen(false);
    } catch (err) {
      alert('新增失敗: ' + err.message);
    } finally {
      setSaving(false);
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
        // ID 越小代表越前面 (通常是新書-待借)，排前面
        return (a.id || 0) - (b.id || 0);
      }
      if (sortBy === 'date_desc') {
        // Empty dates go to the bottom
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
      }
      if (sortBy === 'date_asc') {
        // Empty dates go to the bottom
        if (!a.date) return 1;
        if (!b.date) return -1;
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

  // Pagination
  const totalPages = Math.ceil(filteredBooks.length / ITEMS_PER_PAGE);
  const paginatedBooks = filteredBooks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getCategoryColor = (catId) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    return cat ? cat.color : '#64748b';
  };

  // Loading state
  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <RefreshCw size={48} className="spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
        <h2>載入中...</h2>
        <p style={{ color: 'var(--text-muted)' }}>正在從 Excel 讀取資料</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
        <h2>無法連接到伺服器</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{error}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          請確認已執行 <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>python server.py</code>
        </p>
        <button className="btn-primary" onClick={handleForceRefresh} style={{ marginTop: '1rem' }}>
          <RefreshCw size={18} style={{ marginRight: '6px' }} />
          重試
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Theme Switcher */}
      <div className="theme-switcher">
        <button
          className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
          data-theme="light"
          onClick={() => setTheme('light')}
          title="淺色主題"
        >
          ☀️
        </button>
        <button
          className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
          data-theme="dark"
          onClick={() => setTheme('dark')}
          title="深色主題"
        >
          🌙
        </button>
        <button
          className={`theme-btn ${theme === 'black' ? 'active' : ''}`}
          data-theme="black"
          onClick={() => setTheme('black')}
          title="純黑主題"
        >
          ⚫
        </button>
      </div>

      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 className="animate-fade-in">
          <Library style={{ marginBottom: '-6px', marginRight: '10px' }} size={40} />
          圖書館借書管理系統
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }} className="animate-fade-in">
          Library Borrowing Management • 共 {books.length.toLocaleString()} 本書 • {totalAuthors.toLocaleString()} 位作者
        </p>
        {lastSaved && (
          <p style={{ color: '#4ade80', fontSize: '0.9rem', marginTop: '0.5rem' }} className="animate-fade-in">
            <Check size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            已同步至 Excel • {lastSaved.toLocaleTimeString()}
          </p>
        )}
        {saving && (
          <p style={{ color: '#f59e0b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            <RefreshCw size={14} className="spin" style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            正在儲存...
          </p>
        )}
      </header>

      {/* Category Tabs */}
      <div className="category-tabs animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
            style={{ '--cat-color': cat.color, borderColor: activeCategory === cat.id ? cat.color : 'transparent' }}
            onClick={() => setActiveCategory(cat.id)}
          >
            <span>{cat.label}</span>
            <span className="tab-count">{categoryStats[cat.id]?.toLocaleString()}</span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="filters-bar glass-panel animate-fade-in" style={{ padding: '1rem', animationDelay: '0.2s' }}>
        <div className="search-input-wrapper">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="搜尋書名、作者或備註..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')} title="清除搜尋">
              <X size={18} />
            </button>
          )}
        </div>

        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sort-select">
          <option value="added">依加入時間 (Excel順序)</option>
          <option value="date_desc">依日期 (最新在先)</option>
          <option value="date_asc">依日期 (最舊在先)</option>
          <option value="author">依作者筆畫排序</option>
          <option value="title">依書名筆畫排序</option>
        </select>

        {/* View Toggle */}
        <div className="view-toggle">
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
          <button
            className={`view-btn ${viewMode === 'card' ? 'active' : ''}`}
            onClick={() => setViewMode('card')}
          >
            <LayoutGrid size={18} /> 卡片
          </button>
          <button
            className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            <List size={18} /> 表格
          </button>
        </div>

        <div className="action-buttons">
          <button className="btn-primary" onClick={addNewBook} disabled={saving}>
            <Plus size={18} style={{ marginRight: '6px' }} />
            新增書籍
          </button>
          <button className="btn-secondary" onClick={handleExport} disabled={saving} title="匯出 Excel">
            <Download size={18} style={{ marginRight: '6px' }} />
            匯出
          </button>
          <button className="btn-secondary" onClick={handleForceRefresh} disabled={saving} title="強制重新載入">
            <RefreshCw size={18} style={{ marginRight: '6px' }} />
            重新載入
          </button>

          {activeCategory === '新書-待借' && filteredBooks.length > 0 && (
            <button
              className="btn-secondary"
              style={{ color: '#3b82f6', borderColor: '#3b82f6' }}
              onClick={() => {
                const batchSize = 5;
                const booksToSearch = filteredBooks.slice(0, batchSize);
                if (window.confirm(`為避免卡頓，將優先開啟前 ${booksToSearch.length} 本書的查詢分頁。\n\n搜尋關鍵字將自動優化（去除備註、保留空格）。`)) {
                  booksToSearch.forEach((book, i) => {
                    let term = book.note && (book.note.match(/^(978|979)?\d{9}[\dxX]$|^\d{9}[\dxX]$/))
                      ? (book.note.match(/^(978|979)?\d{9}[\dxX]$|^\d{9}[\dxX]$/)[0])
                      : sanitizeForSearch(book.title);

                    setTimeout(() => {
                      window.open(`https://webpacx.ksml.edu.tw/search?q=${encodeURIComponent(term)}`, '_blank');
                    }, i * 500);
                  });
                }
              }}
            >
              <Search size={18} style={{ marginRight: '6px' }} />
              查詢前 5 本
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      {viewMode !== 'stats' && (
        <div className="results-info animate-fade-in" style={{ animationDelay: '0.25s' }}>
          顯示 <strong>{filteredBooks.length.toLocaleString()}</strong> 本書籍
          {searchTerm && <span> (搜尋: "{searchTerm}")</span>}
          {totalPages > 1 && <span> • 第 {currentPage} / {totalPages} 頁</span>}
        </div>
      )}

      {/* ACTIVITY VIEW */}
      {viewMode === 'activity' && (
        <ActivityLog
          activities={activities}
          stats={activityStats}
          onRefresh={fetchActivities}
          onClear={clearActivities}
          loading={activityLoading}
        />
      )}

      {/* STATS VIEW */}
      {viewMode === 'stats' && <StatsDashboard books={books} categories={CATEGORIES} />}

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="books-table-wrapper animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <table className="books-table">
            <thead>
              <tr>
                <th className="col-index">#</th>
                <th className="col-category">分類</th>
                <th className="col-title">書名</th>
                <th className="col-author">作者</th>
                <th className="col-date" style={{ width: '120px' }}>日期</th>
                <th className="col-note" style={{ width: '120px' }}>備註/借閱人</th>
                <th className="col-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBooks.map((book, i) => {
                const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + i;
                const catColor = getCategoryColor(book.category);
                const isEditing = editingId === book.id;



                return (
                  <tr key={book.id}>
                    <td className="col-index">{globalIndex + 1}</td>
                    <td className="col-category">
                      {isEditing ? (
                        <select
                          value={editForm.category || ''}
                          onChange={(e) => handleChange(e, 'category')}
                          style={{ padding: '4px', fontSize: '0.85rem' }}
                        >
                          {CATEGORIES.filter(c => c.id !== '全部').map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.id}</option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={book.category}
                          onChange={(e) => handleQuickCategoryChange(book, e.target.value)}
                          disabled={saving}
                          className="quick-category-select"
                          style={{
                            background: catColor,
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            fontWeight: '500'
                          }}
                          title="點擊直接切換分類 (自動儲存)"
                        >
                          {CATEGORIES.filter(c => c.id !== '全部').map(cat => (
                            <option key={cat.id} value={cat.id} style={{ background: '#fff', color: '#333' }}>{cat.id}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="col-title">
                      {isEditing ? (
                        <input
                          value={editForm.title || ''}
                          onChange={(e) => handleChange(e, 'title')}
                          onBlur={handleFieldBlur}
                          onKeyDown={handleFieldKeyDown}
                          style={{ width: '100%' }}
                          autoFocus
                        />
                      ) : (
                        <span
                          className="clickable-text"
                          onClick={() => handleQuickFilter(book.title)}
                          title="點擊依書名篩選"
                        >
                          {book.title}
                        </span>
                      )}
                    </td>
                    <td className="col-author">
                      {isEditing ? (
                        <input
                          value={editForm.author || ''}
                          onChange={(e) => handleChange(e, 'author')}
                          onBlur={handleFieldBlur}
                          onKeyDown={handleFieldKeyDown}
                          style={{ width: '100%' }}
                        />
                      ) : (
                        <span
                          className="clickable-text"
                          onClick={() => handleQuickFilter(book.author)}
                          title="點擊依作者篩選"
                        >
                          {book.author || '未分類作者'}
                        </span>
                      )}
                    </td>
                    <td className="col-date">
                      {isEditing ? (
                        <input
                          value={editForm.date || ''}
                          onChange={(e) => handleChange(e, 'date')}
                          onBlur={handleFieldBlur}
                          onKeyDown={handleFieldKeyDown}
                          style={{ width: '100%' }}
                          placeholder="YYYY-MM-DD"
                        />
                      ) : (
                        <span style={{ fontSize: '0.9rem', color: book.date ? 'inherit' : '#9ca3af' }}>
                          {book.date || '-'}
                        </span>
                      )}
                    </td>
                    <td className="col-note">
                      {isEditing ? (
                        <input
                          value={editForm.note || ''}
                          onChange={(e) => handleChange(e, 'note')}
                          onBlur={handleFieldBlur}
                          onKeyDown={handleFieldKeyDown}
                          style={{ width: '100%' }}
                        />
                      ) : (
                        <BorrowerBadge
                          text={book.note}
                          onClick={() => handleQuickFilter(book.note)}
                        />
                      )}
                    </td>
                    <td className="col-actions">
                      {isEditing ? (
                        <div className="table-actions">
                          <button className="btn-icon" onClick={saveEdit} title="儲存" style={{ color: '#4ade80' }} disabled={saving}>✓</button>
                          <button className="btn-icon" onClick={cancelEdit} title="取消" style={{ color: '#f87171' }}>✕</button>
                        </div>
                      ) : (
                        <div className="table-actions">

                          <button
                            className="btn-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(book.title);
                              alert(`已複製書名: ${book.title}`);
                            }}
                            title="複製完整書名"
                            style={{ color: '#8b5cf6' }}
                          >
                            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>C</span>
                          </button>
                          <button className="btn-icon" onClick={() => startEdit(book)} title="編輯" disabled={saving}>
                            <Edit2 size={16} />
                          </button>
                          <button className="btn-icon" onClick={() => requestDeleteBook(book)} title="刪除" style={{ color: '#f87171' }} disabled={saving}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CARD VIEW */}
      {viewMode === 'card' && (
        <div className="books-grid animate-fade-in" style={{ animationDelay: '0.3s' }}>
          {paginatedBooks.map((book) => {
            const isEditing = editingId === book.id;
            const catColor = getCategoryColor(book.category);

            return (
              <div key={book.id} className="glass-card book-card" style={{ '--card-accent': catColor }}>
                {isEditing ? (
                  <>
                    <input value={editForm.title || ''} onChange={(e) => handleChange(e, 'title')} placeholder="書名" style={{ marginBottom: '0.5rem' }} />
                    <input value={editForm.author || ''} onChange={(e) => handleChange(e, 'author')} placeholder="作者" className="author-input" />
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input value={editForm.date || ''} onChange={(e) => handleChange(e, 'date')} placeholder="日期" style={{ flex: 1, fontSize: '0.85rem' }} />
                      <input value={editForm.note || ''} onChange={(e) => handleChange(e, 'note')} placeholder="備註" style={{ flex: 1, fontSize: '0.85rem' }} />
                    </div>
                    <select value={editForm.category || ''} onChange={(e) => handleChange(e, 'category')} style={{ marginTop: '0.5rem' }}>
                      {CATEGORIES.filter(c => c.id !== '全部').map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                      <button className="btn-primary" style={{ flex: 1, background: '#10b981' }} onClick={saveEdit} disabled={saving}>儲存</button>
                      <button className="btn-primary" style={{ flex: 1, background: '#64748b' }} onClick={cancelEdit}>取消</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="book-category-badge" style={{ background: catColor }}>{book.category}</div>
                    <div className="book-title">{book.title}</div>

                    {(book.date || book.note) && (
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem', display: 'flex', gap: '8px' }}>
                        {book.date && <span>📅 {book.date}</span>}
                        {book.note && <span>📝 {book.note}</span>}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={16} />
                        {book.author || '未分類作者'}
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>

                        <button
                          className="btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(book.title);
                            alert(`已複製書名: ${book.title}`);
                          }}
                          title="複製完整書名"
                          style={{ color: '#8b5cf6' }}
                        >
                          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>C</span>
                        </button>
                        <button className="btn-icon" onClick={() => startEdit(book)} title="編輯" disabled={saving}><Edit2 size={18} /></button>
                        <button className="btn-icon" onClick={() => requestDeleteBook(book)} title="刪除" style={{ color: '#f87171' }} disabled={saving}><Trash2 size={18} /></button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            首頁
          </button>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={18} /> 上一頁
          </button>
          <span className="pagination-info">
            第 {currentPage} / {totalPages} 頁
          </span>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            下一頁 <ChevronRight size={18} />
          </button>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            末頁
          </button>
        </div>
      )}

      {filteredBooks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          沒有找到相關書籍
        </div>
      )}


      {/* DELETE CONFIRM MODAL */}
      {deleteConfirm.open && (
        <div className="modal-overlay" onClick={cancelDeleteBook}>
          <div className="modal-content delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h3 className="modal-title" style={{ color: '#ef4444' }}>
                <Trash2 size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                確認刪除
              </h3>
            </div>
            <div style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>確定要刪除這本書嗎？</p>
              <p style={{
                fontWeight: 'bold',
                color: 'var(--text)',
                background: 'var(--bg-tertiary)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                margin: '1rem 0'
              }}>
                「{deleteConfirm.bookTitle}」
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>此操作無法復原</p>
            </div>
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-color)'
            }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={cancelDeleteBook}
                style={{ minWidth: '100px' }}
              >
                取消
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={confirmDeleteBook}
                style={{
                  minWidth: '100px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none'
                }}
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD BOOK MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setAddModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">新增書籍</h3>
              <button className="modal-close" onClick={() => setAddModalOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label className="form-label">書名 *</label>
                <input
                  autoFocus
                  className="form-input"
                  value={addForm.title}
                  onChange={e => setAddForm({ ...addForm, title: e.target.value })}
                  placeholder="請輸入書名"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">作者</label>
                <input
                  className="form-input"
                  value={addForm.author}
                  onChange={e => setAddForm({ ...addForm, author: e.target.value })}
                  placeholder="作者 (預設: 未分類作者)"
                />
              </div>

              <div className="form-group">
                <label className="form-label">日期</label>
                <input
                  type="date"
                  className="form-input"
                  value={addForm.date}
                  onChange={e => setAddForm({ ...addForm, date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">借閱人 / 備註</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    className="form-input"
                    value={BORROWERS.includes(addForm.note) ? addForm.note : (addForm.note ? 'Other' : '')}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'Other') {
                        setAddForm({ ...addForm, note: 'Other' });
                        setCustomBorrower('');
                      } else {
                        setAddForm({ ...addForm, note: val });
                      }
                    }}
                  >
                    <option value="">(無)</option>
                    {BORROWERS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                    <option value="Other">自行輸入...</option>
                  </select>
                </div>
                {addForm.note === 'Other' && (
                  <input
                    style={{ marginTop: '0.5rem' }}
                    className="form-input"
                    value={customBorrower}
                    onChange={e => setCustomBorrower(e.target.value)}
                    placeholder="請輸入借閱人或備註"
                  />
                )}
              </div>

              <div className="form-group">
                <label className="form-label">分類</label>
                <select
                  className="form-input"
                  value={addForm.category}
                  onChange={e => setAddForm({ ...addForm, category: e.target.value })}
                >
                  {CATEGORIES.filter(c => c.id !== '全部').map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setAddModalOpen(false)}>
                  取消
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? '儲存中...' : '確認新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
