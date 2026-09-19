import React, { useRef, useEffect, useState, useId, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading,
  Quote,
  Sparkles,
  Eye,
  Maximize2,
  Minimize2,
  Indent,
  HelpCircle,
  Code,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { RichTextRenderer, formatRichTextToHtml, stripRichText } from './RichTextRenderer';

export interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  minHeight?: number;
  helperText?: string;
  fontFamily?: 'serif' | 'sans';
  id?: string;
  showPreviewToggle?: boolean;
  showWordCount?: boolean;
  isExpandable?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Nhập nội dung văn bản tại đây...',
  label,
  required = false,
  minHeight = 220,
  helperText,
  fontFamily = 'serif',
  id,
  showPreviewToggle = true,
  showWordCount = true,
  isExpandable = true,
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastHtmlRef = useRef<string>('');

  const [editorMode, setEditorMode] = useState<'visual' | 'source' | 'preview'>('visual');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Synchronize incoming value with visual editor
  useEffect(() => {
    if (editorMode === 'visual' && editorRef.current) {
      // If the incoming value has BBCode tags or raw markdown, convert to HTML for visual display
      const currentInner = editorRef.current.innerHTML;
      if (value !== lastHtmlRef.current && value !== currentInner) {
        // Convert any BBCode or raw text into formatted HTML for the visual editor
        const formatted = formatRichTextToHtml(value, false);
        editorRef.current.innerHTML = formatted || '';
        lastHtmlRef.current = value;
      }
    }
  }, [value, editorMode]);

  // Notify parent of changes from visual editor
  const handleVisualInput = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastHtmlRef.current = html;
    onChange(html);
  }, [onChange]);

  // Execute rich formatting commands
  const executeCommand = (command: string, valueArgument?: string) => {
    if (editorMode !== 'visual') {
      setEditorMode('visual');
    }

    // Ensure editor has focus
    if (editorRef.current) {
      editorRef.current.focus();
    }

    try {
      if (command === 'divider') {
        // Insert centered flower divider ❀ ❀ ❀
        document.execCommand(
          'insertHTML',
          false,
          '<div style="text-align: center; color: #ec4899; margin: 1.5rem 0; font-size: 1.25rem; user-select: none;" class="flower-divider">❀ ❀ ❀</div><p><br></p>'
        );
      } else if (command === 'indent') {
        // Author explicitly uses indent tool:
        // Indent the current paragraph block cleanly
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          let node: Node | null = range.startContainer;
          while (node && node !== editorRef.current && node.nodeType !== Node.ELEMENT_NODE) {
            node = node.parentNode;
          }
          if (node && node instanceof HTMLElement && node !== editorRef.current) {
            const currentIndent = node.style.textIndent;
            node.style.textIndent = currentIndent ? '' : '2.2rem';
          } else {
            document.execCommand('indent', false);
          }
        } else {
          document.execCommand('indent', false);
        }
      } else if (command === 'highlight') {
        // Toggle pink highlight
        document.execCommand('hiliteColor', false, '#fce7f3');
      } else {
        document.execCommand(command, false, valueArgument);
      }

      handleVisualInput();
    } catch (err) {
      console.warn('execCommand failed:', err);
    }
  };

  // Switch between Visual, Source, and Preview modes
  const handleModeSwitch = (mode: 'visual' | 'source' | 'preview') => {
    if (mode === 'visual' && editorMode === 'source') {
      // Synchronize from textarea to visual
      if (textareaRef.current && editorRef.current) {
        const textVal = textareaRef.current.value;
        const formatted = formatRichTextToHtml(textVal, false);
        editorRef.current.innerHTML = formatted || '';
        lastHtmlRef.current = textVal;
        onChange(textVal);
      }
    } else if (mode === 'source' && editorMode === 'visual') {
      // Synchronize from visual to textarea
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        lastHtmlRef.current = html;
        onChange(html);
      }
    }
    setEditorMode(mode);
  };

  // Clean empty lines & normalize paragraphs
  const handleNormalizeSpacing = () => {
    if (editorRef.current) {
      // In visual mode, remove empty divs/paragraphs
      const children = Array.from(editorRef.current.children) as HTMLElement[];
      children.forEach((child) => {
        if (!child.textContent?.trim() && !child.querySelector('img, hr, .flower-divider')) {
          child.remove();
        }
      });
      handleVisualInput();
    } else if (textareaRef.current) {
      const normalized = textareaRef.current.value
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      onChange(normalized);
    }
  };

  // Live word & character count
  const plainText = stripRichText(value);
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  const charCount = plainText.length;
  const estReadMinutes = Math.max(1, Math.ceil(wordCount / 220));

  return (
    <div
      id={inputId ? `${inputId}-container` : undefined}
      className={`space-y-1.5 transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 p-4 sm:p-8 bg-stone-900/90 backdrop-blur-md flex flex-col justify-center items-center'
          : 'relative'
      }`}
    >
      <div
        className={`w-full ${
          isFullscreen
            ? 'max-w-5xl h-full max-h-[94vh] bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col border border-pink-200 dark:border-stone-700'
            : 'space-y-1.5'
        }`}
      >
        {/* Header with Label, Mode Toggles & Stats */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {label && (
            <label
              htmlFor={inputId}
              className="text-xs font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-1.5"
            >
              <span>{label}</span>
              {required && <span className="text-rose-500">*</span>}
            </label>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {showWordCount && (
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono bg-stone-100 dark:bg-stone-800/80 px-2 py-0.5 rounded-md border border-stone-200/60 dark:border-stone-700/60">
                {wordCount} từ • {charCount} ký tự • ~{estReadMinutes} phút đọc
              </span>
            )}

            {/* View Mode Switches: Visual vs Source vs Preview */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200/80 dark:border-stone-700">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleModeSwitch('visual')}
                className={`px-2 py-1 text-[11px] font-medium rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                  editorMode === 'visual'
                    ? 'bg-white dark:bg-stone-700 text-pink-600 dark:text-pink-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
                title="Soạn thảo trực quan WYSIWYG (hiển thị trực tiếp chữ in đậm, căn lề, nghiêng mà không hiện mã ký hiệu)"
              >
                <FileText className="w-3 h-3" />
                <span>Trực quan</span>
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleModeSwitch('source')}
                className={`px-2 py-1 text-[11px] font-medium rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                  editorMode === 'source'
                    ? 'bg-white dark:bg-stone-700 text-pink-600 dark:text-pink-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
                title="Xem mã nguồn / văn bản thuần (dành cho người muốn kiểm tra mã hoặc dán văn bản thô)"
              >
                <Code className="w-3 h-3" />
                <span>Mã / Văn bản thô</span>
              </button>

              {showPreviewToggle && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleModeSwitch('preview')}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                    editorMode === 'preview'
                      ? 'bg-white dark:bg-stone-700 text-pink-600 dark:text-pink-400 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                  title="Xem trước chương truyện trên giao diện đọc"
                >
                  <Eye className="w-3 h-3" />
                  <span>Xem trước</span>
                </button>
              )}
            </div>

            {isExpandable && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1 rounded-lg text-stone-500 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Mở rộng toàn màn hình viết'}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Formatting Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-1 p-1.5 rounded-xl bg-stone-100/90 dark:bg-stone-800/90 border border-stone-200/80 dark:border-stone-700 text-xs">
          {/* Main Formatting Action Buttons */}
          <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
            {/* Inline Styles */}
            <div className="flex items-center gap-0.5 pr-1 border-r border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('bold')}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer"
                title="In đậm (Ctrl+B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('italic')}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer"
                title="In nghiêng (Ctrl+I)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('underline')}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer"
                title="Gạch chân (Ctrl+U)"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('strikeThrough')}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer"
                title="Gạch ngang chữ"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('highlight')}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer"
                title="Đánh dấu highlight màu hồng phấn"
              >
                <span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-[10px] bg-pink-200 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 rounded-sm">H</span>
              </button>
            </div>

            {/* Alignments: Left, Center, Right, Justify */}
            <div className="flex items-center gap-0.5 pr-1 border-r border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('justifyLeft')}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer"
                title="Căn lề trái"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('justifyCenter')}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer"
                title="Căn giữa dòng / đoạn"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('justifyRight')}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer"
                title="Căn lề phải"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('justifyFull')}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer"
                title="Căn đều hai bên"
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Structure: Indent (Explicit), Heading, Quote, Divider */}
            <div className="flex items-center gap-0.5 pr-1 border-r border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('indent')}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer"
                title="Thụt đầu dòng đoạn văn này (chỉ thụt lề khi bạn bấm nút này, không tự động thụt lung tung)"
              >
                <Indent className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('formatBlock', '<h3>')}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer"
                title="Tiêu đề đề mục"
              >
                <Heading className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('formatBlock', '<blockquote>')}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer"
                title="Khối trích dẫn / Lời tâm sự"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('divider')}
                className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-pink-600 dark:text-pink-400 font-serif font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1"
                title="Chèn hoa phân cách chính giữa (❀ ❀ ❀)"
              >
                <span>❀ ❀ ❀</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('removeFormat')}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors cursor-pointer"
                title="Xóa định dạng trên phần bôi đen"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Actions */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleNormalizeSpacing}
              className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
              title="Dọn dẹp dòng trống thừa"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span className="hidden sm:inline">Chuẩn hóa dòng</span>
            </button>
          </div>

          {/* Guide Help Toggle */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowHelp(!showHelp)}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-stone-500 hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer ml-auto"
            title="Hướng dẫn định dạng"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Help Box */}
        {showHelp && (
          <div className="p-3 rounded-xl bg-pink-50/70 dark:bg-stone-800/70 border border-pink-200 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-300 space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-pink-700 dark:text-pink-300">
              <span>🌸 Hướng dẫn bộ soạn thảo định dạng trực quan:</span>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                ✕ Đóng
              </button>
            </div>
            <p className="leading-relaxed">
              • <strong>Soạn thảo trực quan (WYSIWYG):</strong> Bôi đen văn bản rồi bấm nút tương ứng trên thanh công cụ. Chữ sẽ <strong>in đậm</strong>, <em>in nghiêng</em> hoặc được căn giữa ngay lập tức, không hiển thị mã ký hiệu như <code>**</code> hay <code>[center]</code>.
            </p>
            <p className="leading-relaxed">
              • <strong>Thụt lề đoạn văn:</strong> Mặc định hệ thống <u>không tự động thụt lề</u> bất kỳ đoạn văn nào. Khi muốn thụt đầu dòng cho đoạn nào, bạn chỉ cần đặt con trỏ tại đoạn đó và bấm nút <Indent className="w-3 h-3 inline mx-0.5 text-pink-600" /> <strong>Thụt dòng</strong>.
            </p>
            <p className="leading-relaxed">
              • <strong>Phím tắt nhanh:</strong> <kbd className="px-1 py-0.5 bg-white dark:bg-stone-700 rounded border border-stone-200 dark:border-stone-600 font-mono text-[10px]">Ctrl+B</kbd> (In đậm), <kbd className="px-1 py-0.5 bg-white dark:bg-stone-700 rounded border border-stone-200 dark:border-stone-600 font-mono text-[10px]">Ctrl+I</kbd> (In nghiêng), <kbd className="px-1 py-0.5 bg-white dark:bg-stone-700 rounded border border-stone-200 dark:border-stone-600 font-mono text-[10px]">Ctrl+U</kbd> (Gạch chân).
            </p>
          </div>
        )}

        {/* Editor Area */}
        <div
          className={`w-full rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 transition-all focus-within:ring-2 focus-within:ring-pink-300 focus-within:border-pink-400 ${
            isFullscreen ? 'flex-1 overflow-hidden flex flex-col' : ''
          }`}
        >
          {editorMode === 'preview' ? (
            /* PREVIEW MODE */
            <div
              className={`w-full overflow-y-auto p-4 sm:p-6 bg-pink-50/10 dark:bg-stone-900/60 ${
                fontFamily === 'serif' ? 'font-serif' : 'font-sans'
              } text-stone-900 dark:text-stone-100 text-sm sm:text-base leading-relaxed custom-scrollbar`}
              style={{ minHeight: `${minHeight}px`, height: isFullscreen ? '100%' : 'auto' }}
            >
              {value && value.trim() ? (
                <RichTextRenderer content={value} indentParagraphs={false} />
              ) : (
                <p className="text-stone-400 italic">Chưa có nội dung văn bản để xem trước.</p>
              )}
            </div>
          ) : editorMode === 'source' ? (
            /* SOURCE / PLAIN TEXT MODE */
            <textarea
              ref={textareaRef}
              rows={8}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className={`w-full p-4 bg-transparent outline-none resize-none font-mono text-xs sm:text-sm leading-relaxed text-stone-900 dark:text-stone-100 custom-scrollbar ${
                isFullscreen ? 'flex-1 h-full' : ''
              }`}
              style={{ minHeight: `${minHeight}px` }}
            />
          ) : (
            /* VISUAL WYSIWYG MODE */
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleVisualInput}
              onBlur={handleVisualInput}
              role="textbox"
              aria-multiline="true"
              data-placeholder={placeholder}
              className={`w-full p-4 sm:p-5 bg-transparent outline-none overflow-y-auto select-text text-stone-900 dark:text-stone-100 text-sm sm:text-base leading-relaxed ${
                fontFamily === 'serif' ? 'font-serif' : 'font-sans'
              } custom-scrollbar relative empty:before:content-[attr(data-placeholder)] empty:before:text-stone-400 empty:before:pointer-events-none ${
                isFullscreen ? 'flex-1 h-full' : ''
              }`}
              style={{
                minHeight: `${minHeight}px`,
                // Ensure no default indentation
                textIndent: '0',
              }}
            />
          )}
        </div>

        {/* Helper Note */}
        {helperText && (
          <p className="text-[11px] text-stone-500 dark:text-stone-400 italic">{helperText}</p>
        )}
      </div>
    </div>
  );
};
