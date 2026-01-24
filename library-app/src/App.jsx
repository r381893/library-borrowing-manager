import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Users, Edit2, Library, Trash2, X, Plus, LayoutGrid, List, ChevronLeft, ChevronRight, RefreshCw, Check, AlertCircle } from 'lucide-react';
import './App.css';

// API Base URL - localhost for development, relative for production
const API_URL = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

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
  const [sortBy, setSortBy] = useState('added'); // 預設依加入時間 (最新在最上面)
  const [viewMode, setViewMode] = useState('table');
  const [currentPage, setCurrentPage] = useState(1);

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

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

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

  const saveEdit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/books/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) throw new Error('儲存失敗');

      setBooks(books.map(b => b.id === editingId ? { ...editForm } : b));
      setEditingId(null);
      setLastSaved(new Date());
    } catch (err) {
      alert('儲存失敗: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteBook = async (bookId) => {
    if (!window.confirm('確定要刪除這本書嗎？')) return;

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

  const handleChange = (e, field) => {
    setEditForm({ ...editForm, [field]: e.target.value });
  };

  const handleQuickFilter = (text) => {
    if (!text || text === '-' || text === '未分類作者') return;
    setSearchTerm(text);
  };

  const addNewBook = async () => {
    const title = prompt('請輸入新書名');
    if (!title) return;

    setSaving(true);
    try {
      const newBook = {
        title,
        author: '未分類作者',
        category: activeCategory === '全部' ? '新書-待借' : activeCategory
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
        // ID 越大代表越新，排前面
        return (b.id || 0) - (a.id || 0);
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
        <button className="btn-primary" onClick={fetchBooks} style={{ marginTop: '1rem' }}>
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
          <option value="added">依加入時間 (最新)</option>
          <option value="author">依作者筆畫排序</option>
          <option value="title">依書名筆畫排序</option>
        </select>

        {/* View Toggle */}
        <div className="view-toggle">
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
          <button className="btn-secondary" onClick={fetchBooks} disabled={saving}>
            <RefreshCw size={18} style={{ marginRight: '6px' }} />
            重新載入
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="results-info animate-fade-in" style={{ animationDelay: '0.25s' }}>
        顯示 <strong>{filteredBooks.length.toLocaleString()}</strong> 本書籍
        {searchTerm && <span> (搜尋: "{searchTerm}")</span>}
        {totalPages > 1 && <span> • 第 {currentPage} / {totalPages} 頁</span>}
      </div>

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
                        <span className="table-category-badge" style={{ background: catColor }}>
                          {book.category}
                        </span>
                      )}
                    </td>
                    <td className="col-title">
                      {isEditing ? (
                        <input
                          value={editForm.title || ''}
                          onChange={(e) => handleChange(e, 'title')}
                          style={{ width: '100%' }}
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
                          style={{ width: '100%' }}
                        />
                      ) : (
                        <span
                          className={book.note ? "clickable-text" : ""}
                          style={{ fontSize: '0.9rem', color: book.note ? 'inherit' : '#9ca3af' }}
                          onClick={() => handleQuickFilter(book.note)}
                          title={book.note ? "點擊依備註篩選" : ""}
                        >
                          {book.note || '-'}
                        </span>
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
                          <button className="btn-icon" onClick={() => startEdit(book)} title="編輯" disabled={saving}>
                            <Edit2 size={16} />
                          </button>
                          <button className="btn-icon" onClick={() => deleteBook(book.id)} title="刪除" style={{ color: '#f87171' }} disabled={saving}>
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
                        <button className="btn-icon" onClick={() => startEdit(book)} title="編輯" disabled={saving}><Edit2 size={18} /></button>
                        <button className="btn-icon" onClick={() => deleteBook(book.id)} title="刪除" style={{ color: '#f87171' }} disabled={saving}><Trash2 size={18} /></button>
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
    </div>
  );
}

export default App;
