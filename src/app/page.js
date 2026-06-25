"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { faImages, faTrashAlt, faUpload, faSearchPlus, faSignOutAlt, faCopy, faCheck, faCloudArrowUp, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import Footer from '@/components/Footer'
import LoadingOverlay from "@/components/LoadingOverlay";


export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTab, setActiveTab] = useState('preview');
  const [uploading, setUploading] = useState(false);
  const [boxType, setBoxtype] = useState("img");
  const [isDragOver, setIsDragOver] = useState(false);

  // 登录态
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const parentRef = useRef(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch(`/api/auth/check`);
      const data = await res.json();
      if (data.authenticated) {
        setAuthenticated(true);
      }
    } catch (error) {
      console.error('检查登录态出错:', error);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const res = await fetch(`/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAuthenticated(true);
        setPassword('');
        toast.success('登录成功');
      } else {
        toast.error(data.message || '登录失败');
      }
    } catch (error) {
      toast.error('登录请求失败');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`/api/logout`, { method: 'POST' });
      setAuthenticated(false);
      setUploadedImages([]);
      setSelectedFiles([]);
      toast.success('已登出');
    } catch (error) {
      toast.error('登出失败');
    }
  };

  const handleFileChange = (event) => {
    const newFiles = event.target.files;
    const filteredFiles = Array.from(newFiles).filter(file =>
      !selectedFiles.find(selFile => selFile.name === file.name));
    const uniqueFiles = filteredFiles.filter(file =>
      !uploadedImages.find(upImg => upImg.name === file.name)
    );
    setSelectedFiles([...selectedFiles, ...uniqueFiles]);
  };

  const handleClear = () => {
    setSelectedFiles([]);
  };

  const getTotalSizeInMB = (files) => {
    const totalSizeInBytes = Array.from(files).reduce((acc, file) => acc + file.size, 0);
    return (totalSizeInBytes / (1024 * 1024)).toFixed(2);
  };

  const handleUpload = async (file = null) => {
    setUploading(true);
    const filesToUpload = file ? [file] : selectedFiles;

    if (filesToUpload.length === 0) {
      toast.error('请选择要上传的文件');
      setUploading(false);
      return;
    }

    let successCount = 0;

    try {
      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append("file", file);

        try {
          const response = await fetch(`/api/upload`, {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            file.url = result.url;
            setUploadedImages((prevImages) => [...prevImages, file]);
            setSelectedFiles((prevFiles) => prevFiles.filter(f => f !== file));
            successCount++;
          } else {
            let errorMsg;
            try {
              const errorData = await response.json();
              errorMsg = errorData.message || `上传 ${file.name} 时出错`;
            } catch {
              errorMsg = `上传 ${file.name} 时发生未知错误`;
            }

            switch (response.status) {
              case 400: toast.error(`请求无效: ${errorMsg}`); break;
              case 401:
                toast.error(`未登录: ${errorMsg}`);
                setAuthenticated(false);
                break;
              case 403: toast.error(`上传被拒绝: ${errorMsg}`); break;
              case 500: toast.error(`服务器错误: ${errorMsg}`); break;
              default: toast.error(`上传 ${file.name} 出错: ${errorMsg}`);
            }
          }
        } catch (error) {
          toast.error(`上传 ${file.name} 时出错`);
        }
      }

      if (successCount > 0) {
        toast.success(`已成功上传 ${successCount} 张图片`);
      }
    } catch (error) {
      console.error('上传过程中出现错误:', error);
      toast.error('上传错误');
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = (event) => {
    const clipboardItems = event.clipboardData.items;
    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];
      if (item.kind === 'file' && item.type.includes('image')) {
        const file = item.getAsFile();
        setSelectedFiles([...selectedFiles, file]);
        break;
      }
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const filteredFiles = Array.from(files).filter(file => !selectedFiles.find(selFile => selFile.name === file.name));
      setSelectedFiles([...selectedFiles, ...filteredFiles]);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleImageClick = (index) => {
    if (selectedFiles[index].type.startsWith('image/')) {
      setBoxtype("img");
    } else if (selectedFiles[index].type.startsWith('video/')) {
      setBoxtype("video");
    } else {
      setBoxtype("other");
    }
    setSelectedImage(URL.createObjectURL(selectedFiles[index]));
  };

  const handleCloseImage = () => {
    setSelectedImage(null);
  };

  const handleRemoveImage = (index) => {
    const updatedFiles = selectedFiles.filter((_, idx) => idx !== index);
    setSelectedFiles(updatedFiles);
  };

  const handleCopy = async (text, index = null) => {
    try {
      await navigator.clipboard.writeText(text);
      if (index !== null) {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      }
      toast.success('链接复制成功');
    } catch (err) {
      toast.error("链接复制失败");
    }
  };

  const handlerenderImageClick = (imageUrl, type) => {
    setBoxtype(type);
    setSelectedImage(imageUrl);
  };

  const renderFile = (data) => {
    const fileUrl = data.url;
    if (data.type.startsWith('image/')) {
      return (
        <img
          src={data.url}
          alt="Uploaded"
          className="object-cover w-28 h-28 rounded-xl cursor-pointer"
          onClick={() => handlerenderImageClick(fileUrl, "img")}
        />
      );
    } else if (data.type.startsWith('video/')) {
      return (
        <video
          src={data.url}
          className="object-cover w-28 h-28 rounded-xl cursor-pointer"
          controls
          onClick={() => handlerenderImageClick(fileUrl, "video")}
        >
          Your browser does not support the video tag.
        </video>
      );
    } else {
      return (
        <img
          src={data.url}
          alt="Uploaded"
          className="object-cover w-28 h-28 rounded-xl cursor-pointer"
          onClick={() => handlerenderImageClick(fileUrl, "other")}
        />
      );
    }
  };

  const renderTabContent = () => {
    const linkFormats = uploadedImages.map((data) => {
      switch (activeTab) {
        case 'htmlLinks': return `<img src="${data.url}" alt="${data.name}" />`;
        case 'markdownLinks': return `![${data.name}](${data.url})`;
        case 'bbcodeLinks': return `[img]${data.url}[/img]`;
        case 'viewLinks': return data.url;
        default: return null;
      }
    }).filter(Boolean);

    if (activeTab !== 'preview' && linkFormats.length > 0) {
      return (
        <div ref={parentRef} className="card rounded-2xl p-4 space-y-2">
          {linkFormats.map((text, i) => (
            <div
              key={i}
              className="flex items-center gap-2 group cursor-pointer hover:bg-cyan-50 px-3 py-2 rounded-lg transition-colors duration-200"
              onClick={() => handleCopy(text, i)}
            >
              <code className="text-sm text-slate-600 break-all flex-1">{text}</code>
              <FontAwesomeIcon
                icon={copiedIndex === i ? faCheck : faCopy}
                className={`text-sm ${copiedIndex === i ? 'text-green-500' : 'text-slate-400 group-hover:text-cyan-600'} transition-colors duration-200 flex-shrink-0`}
              />
            </div>
          ))}
        </div>
      );
    }

    // preview tab
    return (
      <div className="space-y-3">
        {uploadedImages.map((data, index) => (
          <div key={index} className="card card-hover rounded-2xl p-4 flex items-center gap-4 fade-in">
            {renderFile(data)}
            <div className="flex-1 min-w-0 space-y-1.5">
              <input
                readOnly
                value={data.url}
                onClick={() => handleCopy(data.url)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-cyan-400 cursor-pointer"
              />
              <input
                readOnly
                value={`![${data.name}](${data.url})`}
                onClick={() => handleCopy(`![${data.name}](${data.url})`)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-400 focus:outline-none focus:border-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 检查登录态中
  if (checkingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 animate-pulse">加载中...</div>
      </main>
    );
  }

  // 未登录：登录界面
  if (!authenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-50 mb-5">
              <FontAwesomeIcon icon={faCloudArrowUp} className="text-2xl text-cyan-600" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">r2-image</h1>
            <p className="text-sm text-slate-400 mt-2">请输入密码以上传图片</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码"
                autoFocus
                className="w-full px-4 py-3 pr-11 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition-colors duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-600 cursor-pointer transition-colors duration-200"
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
              >
                <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} className="text-sm" />
              </button>
            </div>
            <button
              type="submit"
              disabled={loggingIn}
              className={`w-full py-3 rounded-xl font-medium text-white transition-all duration-200 ${loggingIn ? 'bg-green-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 cursor-pointer'}`}
            >
              {loggingIn ? '登录中...' : '登录'}
            </button>
          </form>
        </div>
        <ToastContainer />
      </main>
    );
  }

  // 已登录：上传界面
  return (
    <main className="min-h-screen flex flex-col items-center px-4 sm:px-6 lg:px-8 pb-20">
      {/* 顶部导航 */}
      <header className="w-full max-w-3xl flex justify-between items-center py-6">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faCloudArrowUp} className="text-xl text-cyan-600" />
          <span className="text-slate-800 font-semibold tracking-tight">r2-image</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 hover:text-cyan-600 bg-white border border-slate-200 card-hover rounded-lg cursor-pointer transition-colors duration-200"
        >
          <FontAwesomeIcon icon={faSignOutAlt} className="text-xs" />
          登出
        </button>
      </header>

      {/* 上传区域 */}
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight mb-3">
            上传图片，获取链接
          </h2>
          <p className="text-sm text-slate-400">
            支持拖拽、粘贴或选择文件 · 最大 100 MB
          </p>
        </div>

        {/* 拖拽上传区 */}
        <div
          className={`relative card rounded-2xl border-2 border-dashed border-slate-200 transition-all duration-200 ${isDragOver ? 'dropzone-active' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onPaste={handlePaste}
          style={{ minHeight: selectedFiles.length === 0 ? '240px' : 'auto' }}
        >
          <LoadingOverlay loading={uploading} />
          {selectedFiles.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <FontAwesomeIcon icon={faCloudArrowUp} className="text-4xl text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm">拖拽文件到这里，或粘贴截图</p>
              <p className="text-slate-300 text-xs mt-1">支持图片和视频</p>
            </div>
          ) : (
            <div className="p-4 flex flex-wrap gap-3">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative rounded-xl overflow-hidden w-32 h-36 card fade-in">
                  <div className="relative w-full h-24" onClick={() => handleImageClick(index)}>
                    {file.type.startsWith('image/') && (
                      <Image
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${file.name}`}
                        fill={true}
                        className="object-cover"
                      />
                    )}
                    {file.type.startsWith('video/') && (
                      <video src={URL.createObjectURL(file)} controls className="w-full h-full" />
                    )}
                    {!file.type.startsWith('image/') && !file.type.startsWith('video/') && (
                      <div className="flex items-center justify-center w-full h-full bg-slate-50 text-slate-400 text-xs p-2 text-center">
                        {file.name}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-around items-center h-10 bg-slate-50 border-t border-slate-100">
                    <button
                      className="text-slate-400 hover:text-cyan-600 cursor-pointer transition-colors duration-200"
                      onClick={() => handleImageClick(index)}
                      aria-label="预览"
                    >
                      <FontAwesomeIcon icon={faSearchPlus} className="text-sm" />
                    </button>
                    <button
                      className="text-slate-400 hover:text-red-500 cursor-pointer transition-colors duration-200"
                      onClick={() => handleRemoveImage(index)}
                      aria-label="删除"
                    >
                      <FontAwesomeIcon icon={faTrashAlt} className="text-sm" />
                    </button>
                    <button
                      className="text-slate-400 hover:text-green-500 cursor-pointer transition-colors duration-200"
                      onClick={() => handleUpload(file)}
                      aria-label="上传"
                    >
                      <FontAwesomeIcon icon={faUpload} className="text-sm" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <label
            htmlFor="file-upload"
            className="card card-hover rounded-xl h-12 flex items-center justify-center text-slate-600 text-sm cursor-pointer transition-colors duration-200"
          >
            <FontAwesomeIcon icon={faImages} className="mr-2 text-cyan-600" />
            选择文件
          </label>
          <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} multiple />

          <div className="card rounded-xl h-12 flex items-center justify-center text-slate-400 text-sm">
            <span>{selectedFiles.length} 个 · {getTotalSizeInMB(selectedFiles)} MB</span>
          </div>

          <button
            onClick={handleClear}
            disabled={selectedFiles.length === 0}
            className={`card card-hover rounded-xl h-12 flex items-center justify-center text-sm cursor-pointer transition-colors duration-200 ${selectedFiles.length === 0 ? 'opacity-40 cursor-not-allowed' : 'text-slate-600 hover:text-red-500'}`}
          >
            <FontAwesomeIcon icon={faTrashAlt} className="mr-2" />
            清除
          </button>

          <button
            onClick={() => handleUpload()}
            disabled={selectedFiles.length === 0 || uploading}
            className={`rounded-xl h-12 flex items-center justify-center text-sm font-medium text-white transition-all duration-200 ${selectedFiles.length === 0 || uploading ? 'bg-green-300 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 cursor-pointer'}`}
          >
            <FontAwesomeIcon icon={faUpload} className="mr-2" />
            上传
          </button>
        </div>

        {/* 上传结果 */}
        {uploadedImages.length > 0 && (
          <div className="mt-10 fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">上传结果</h3>
              <span className="text-xs text-slate-400">{uploadedImages.length} 张</span>
            </div>

            {/* 格式切换 */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { key: 'preview', label: '预览' },
                { key: 'htmlLinks', label: 'HTML' },
                { key: 'markdownLinks', label: 'Markdown' },
                { key: 'bbcodeLinks', label: 'BBCode' },
                { key: 'viewLinks', label: '链接' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors duration-200 ${activeTab === tab.key ? 'bg-cyan-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:text-cyan-600'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {renderTabContent()}
          </div>
        )}
      </div>

      {/* 图片放大预览 */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={handleCloseImage}>
          <div className="relative flex flex-col items-center">
            <button
              className="absolute -top-12 right-0 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-cyan-400 cursor-pointer transition-colors duration-200"
              onClick={handleCloseImage}
              aria-label="关闭"
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {boxType === "img" ? (
              <img src={selectedImage} alt="Selected" className="max-w-[90vw] max-h-[80vh] rounded-xl object-contain" />
            ) : boxType === "video" ? (
              <video src={selectedImage} className="max-w-[90vw] max-h-[80vh] rounded-xl" controls />
            ) : (
              <div className="p-6 bg-white rounded-xl text-slate-600">Unsupported file type</div>
            )}
          </div>
        </div>
      )}

      {/* 底部 */}
      <div className="w-full max-w-3xl mt-auto">
        <Footer />
      </div>

      <ToastContainer />
    </main>
  );
}
