"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudArrowUp, faSignOutAlt, faTrashAlt, faArrowLeft, faCheck, faCopy, faSpinner, faImages } from '@fortawesome/free-solid-svg-icons';
import { ToastContainer, toast } from "react-toastify";
import Footer from '@/components/Footer';
import LoadingOverlay from "@/components/LoadingOverlay";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ListPage() {
  const router = useRouter();
  const [images, setImages] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [copiedName, setCopiedName] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch(`/api/auth/check`);
      const data = await res.json();
      if (data.authenticated) {
        setAuthenticated(true);
        loadImages(true);
      } else {
        router.push('/');
      }
    } catch (error) {
      router.push('/');
    } finally {
      setCheckingAuth(false);
    }
  };

  const loadImages = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const cur = reset ? '' : `&cursor=${encodeURIComponent(cursor || '')}`;
      const res = await fetch(`/api/list?limit=100${cur}`);
      if (res.status === 401) {
        router.push('/');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setImages(prev => reset ? data.objects : [...prev, ...data.objects]);
        setCursor(data.cursor);
        setHasMore(data.truncated);
      } else {
        toast.error(data.message || '加载失败');
      }
    } catch (error) {
      toast.error('加载图片列表失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [cursor, router]);

  const handleLogout = async () => {
    try {
      await fetch(`/api/logout`, { method: 'POST' });
      router.push('/');
    } catch (error) {
      toast.error('登出失败');
    }
  };

  const toggleSelect = (name) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(images.map(i => i.name)));
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  const copyUrl = async (name) => {
    const url = `${window.location.origin}/api/rfile/${name}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedName(name);
      setTimeout(() => setCopiedName(null), 2000);
      toast.success('链接复制成功');
    } catch {
      toast.error('复制失败');
    }
  };

  const doDelete = async (names) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const set = new Set(names);
        setImages(prev => prev.filter(i => !set.has(i.name)));
        setSelected(prev => {
          const next = new Set(prev);
          names.forEach(n => next.delete(n));
          return next;
        });
        toast.success(`已删除 ${data.deleted} 个文件`);
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch (error) {
      toast.error('删除请求失败');
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = (name) => {
    if (!window.confirm(`确认删除 ${name}？`)) return;
    doDelete([name]);
  };

  const handleBatchDelete = () => {
    const names = Array.from(selected);
    if (names.length === 0) return;
    if (!window.confirm(`确认删除选中的 ${names.length} 个文件？此操作不可恢复。`)) return;
    doDelete(names);
  };

  if (checkingAuth || !authenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 animate-pulse">加载中...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 sm:px-6 lg:px-8 pb-20">
      {/* 顶部导航 */}
      <header className="w-full max-w-5xl flex justify-between items-center py-6">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faCloudArrowUp} className="text-xl text-cyan-600" />
          <span className="text-slate-800 font-semibold tracking-tight">r2-image</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 hover:text-cyan-600 bg-white border border-slate-200 card-hover rounded-lg cursor-pointer transition-colors duration-200"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
            上传
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 hover:text-cyan-600 bg-white border border-slate-200 card-hover rounded-lg cursor-pointer transition-colors duration-200"
          >
            <FontAwesomeIcon icon={faSignOutAlt} className="text-xs" />
            登出
          </button>
        </div>
      </header>

      <div className="w-full max-w-5xl">
        {/* 标题 + 工具栏 */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">图片管理</h2>
            <p className="text-sm text-slate-400 mt-1">共 {images.length} 个文件{hasMore ? '（更多加载中…）' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 ? (
              <>
                <span className="text-sm text-cyan-600">已选 {selected.size} 项</span>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1.5 text-sm bg-white border border-slate-200 text-slate-500 hover:text-slate-700 card-hover rounded-lg cursor-pointer transition-colors duration-200"
                >
                  取消选择
                </button>
                <button
                  onClick={handleBatchDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-red-500 hover:bg-red-600 card-hover rounded-lg cursor-pointer transition-colors duration-200 disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faTrashAlt} className="text-xs" />
                  批量删除
                </button>
              </>
            ) : (
              images.length > 0 && (
                <button
                  onClick={selectAll}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-slate-200 text-slate-500 hover:text-cyan-600 card-hover rounded-lg cursor-pointer transition-colors duration-200"
                >
                  <FontAwesomeIcon icon={faCheck} className="text-xs" />
                  全选
                </button>
              )
            )}
          </div>
        </div>

        {/* 图片网格 */}
        <div className="relative">
          <LoadingOverlay loading={deleting} />
          {loading ? (
            <div className="flex justify-center py-20">
              <FontAwesomeIcon icon={faSpinner} className="text-3xl text-cyan-600 animate-spin" />
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <FontAwesomeIcon icon={faImages} className="text-4xl mb-3 text-slate-300" />
              <p className="text-sm">还没有上传过图片</p>
              <Link href="/" className="mt-4 text-cyan-600 hover:text-cyan-500 text-sm transition-colors duration-200">
                去上传 →
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((img) => (
                  <div
                    key={img.name}
                    className={`relative group card rounded-2xl overflow-hidden fade-in ${selected.has(img.name) ? 'ring-2 ring-cyan-500' : ''}`}
                  >
                    {/* 缩略图 */}
                    <div
                      className="relative w-full aspect-square bg-slate-50 cursor-pointer"
                      onClick={() => setPreviewImage(`${window.location.origin}/api/rfile/${img.name}`)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/rfile/${img.name}`}
                        alt={img.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                      {/* 选中勾选 */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(img.name); }}
                        className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-all duration-200 ${selected.has(img.name) ? 'bg-cyan-500 text-white shadow' : 'bg-white/80 text-transparent border border-slate-300 shadow-sm hover:bg-white group-hover:text-slate-400'}`}
                        aria-label="选择"
                      >
                        <FontAwesomeIcon icon={faCheck} className="text-xs" />
                      </button>
                      {/* 操作按钮组 */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={(e) => { e.stopPropagation(); copyUrl(img.name); }}
                          className="w-6 h-6 rounded-md bg-white/80 hover:bg-white border border-slate-300 shadow-sm text-slate-500 hover:text-cyan-600 flex items-center justify-center cursor-pointer transition-colors duration-200"
                          aria-label="复制链接"
                        >
                          <FontAwesomeIcon icon={copiedName === img.name ? faCheck : faCopy} className="text-xs" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(img.name); }}
                          className="w-6 h-6 rounded-md bg-white/80 hover:bg-white border border-slate-300 shadow-sm text-slate-500 hover:text-red-500 flex items-center justify-center cursor-pointer transition-colors duration-200"
                          aria-label="删除"
                        >
                          <FontAwesomeIcon icon={faTrashAlt} className="text-xs" />
                        </button>
                      </div>
                    </div>
                    {/* 文件信息 */}
                    <div className="px-2 py-2 bg-white">
                      <p className="text-xs text-slate-500 truncate" title={img.name}>{img.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatSize(img.size)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 加载更多 */}
              {hasMore && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => loadImages(false)}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm text-slate-600 bg-white border border-slate-200 card-hover rounded-xl cursor-pointer transition-colors duration-200 disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <><FontAwesomeIcon icon={faSpinner} className="text-xs animate-spin" /> 加载中...</>
                    ) : (
                      '加载更多'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 图片放大预览 */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setPreviewImage(null)}>
          <div className="relative flex flex-col items-center">
            <button
              className="absolute -top-12 right-0 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-cyan-400 cursor-pointer transition-colors duration-200"
              onClick={() => setPreviewImage(null)}
              aria-label="关闭"
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage} alt="预览" className="max-w-[90vw] max-h-[80vh] rounded-xl object-contain" />
          </div>
        </div>
      )}

      <div className="w-full max-w-5xl mt-auto">
        <Footer />
      </div>

      <ToastContainer />
    </main>
  );
}
