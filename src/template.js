import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { CDN_PREFIX, SUPPORTED_LANG } from './constant'

dayjs.extend(relativeTime)

const SWITCHER = (text, open, className = '') => `
<span class="opt-desc">${text}</span>
<label class="opt-switcher ${className}">
  <input type="checkbox" ${open ? 'checked' : ''}>
  <span class="slider round"></span>
</label>
`
const FOOTER = ({ lang, isEdit, updateAt, pw, mode, share }) => `
    <div class="footer">
        ${isEdit ? `
            <div class="opt">
                <a href="/list" class="opt-button opt-list-btn" style="text-decoration:none;margin-right:6px">☰ 列表</a>
                <button class="opt-button opt-pw">${pw ? SUPPORTED_LANG[lang].changePW : SUPPORTED_LANG[lang].setPW}</button>
                ${SWITCHER('Markdown', mode === 'md', 'opt-mode')}
                ${SWITCHER(SUPPORTED_LANG[lang].share, share, 'opt-share')}
            </div>
            ` : ''
    }

        ${updateAt ? `<span class="last-modified">${SUPPORTED_LANG[lang].lastModified} ${dayjs.unix(updateAt).fromNow()}</span>` : ''}
    </div>
`
const MODAL = lang => `
<div class="modal share-modal">
    <div class="modal-mask"></div>
    <div class="modal-content">
        <span class="close-btn">x</span>
        <div class="modal-body">
            <input type="text" readonly value="" />
            <button class="opt-button">${SUPPORTED_LANG[lang].copy}</button>
        </div>
    </div>
</div>
`
const HTML = ({ lang, title, content, ext = {}, tips, isEdit, showPwPrompt }) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} — Cloud Notepad</title>
    <link href="${CDN_PREFIX}/favicon.ico" rel="shortcut icon" type="image/ico" />
    <link href="${CDN_PREFIX}/css/app.css" rel="stylesheet" media="screen" />
</head>
<body>
    <div class="note-container">
        <div class="stack">
            <div class="layer_1">
                <div class="layer_2">
                    <div class="layer_3">
                        ${tips ? `<div class="tips">${tips}</div>` : ''}
                        <textarea id="contents" class="contents ${isEdit ? '' : 'hide'}" spellcheck="true" placeholder="${SUPPORTED_LANG[lang].emptyPH}">${content}</textarea>
                        ${(isEdit && ext.mode === 'md') ? '<div class="divide-line"></div>' : ''}
                        ${tips || (isEdit && ext.mode !== 'md') ? '' : `<div id="preview-${ext.mode || 'plain'}" class="contents"></div>`}
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div id="loading"></div>
    ${MODAL(lang)}
    ${FOOTER({ ...ext, isEdit, lang })}
    ${(ext.mode === 'md' || ext.share) ? `<script src="${CDN_PREFIX}/js/purify.min.js"></script>` : ''}
    ${ext.mode === 'md' ? `<script src="${CDN_PREFIX}/js/marked.min.js"></script>` : ''}
    <script src="${CDN_PREFIX}/js/clip.js"></script>
    <script src="${CDN_PREFIX}/js/app.js"></script>
    ${showPwPrompt ? '<script>passwdPrompt()</script>' : ''}
</body>
</html>
`

export const Edit = data => HTML({ isEdit: true, ...data })
export const Share = data => HTML(data)
export const NeedPasswd = data => HTML({ tips: SUPPORTED_LANG[data.lang].tipEncrypt, showPwPrompt: true, ...data })
export const Page404 = data => HTML({ tips: SUPPORTED_LANG[data.lang].tip404, ...data })

export const List = ({ notes = [] }) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>记事本 · 列表</title>
    <link href="/favicon.ico" rel="shortcut icon" type="image/ico" />
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif; background: #ebeef2; min-height: 100vh; }
        .topbar { background: #fff; border-bottom: 1px solid #dde1e7; padding: 12px 16px; display: flex; align-items: center; gap: 10px; position: sticky; top: 0; z-index: 10; }
        .topbar h1 { font-size: 16px; font-weight: 600; color: #333; white-space: nowrap; }
        .search-wrap { flex: 1; position: relative; }
        .search-wrap input { width: 100%; padding: 8px 12px 8px 32px; border: 1px solid #dde1e7; border-radius: 6px; font-size: 14px; background: #f5f7fa; outline: none; }
        .search-wrap input:focus { border-color: #555; background: #fff; }
        .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #999; font-size: 13px; }
        .btn-new { padding: 8px 14px; background: #333; color: #fff; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; white-space: nowrap; }
        .list { padding: 14px 16px; max-width: 700px; margin: 0 auto; }
        .list-meta { font-size: 12px; color: #999; margin-bottom: 10px; }
        .note-card { background: #fff; border-radius: 8px; padding: 13px 14px; margin-bottom: 8px; cursor: pointer; border: 1px solid transparent; display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; transition: border-color .15s, box-shadow .15s; }
        .note-card:hover { border-color: #c8d0dc; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
        .note-icon { width: 32px; height: 32px; border-radius: 6px; background: #f0f4ff; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
        .note-icon.locked { background: #fff5f0; }
        .note-icon.shared { background: #f0fff4; }
        .note-body { flex: 1; min-width: 0; }
        .note-title { font-size: 14px; font-weight: 600; color: #222; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
        .note-preview { font-size: 12px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .note-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
        .note-time { font-size: 11px; color: #bbb; }
        .tags { display: flex; gap: 3px; }
        .tag { font-size: 10px; padding: 1px 6px; border-radius: 20px; font-weight: 500; }
        .tag-lock { background: #fff0eb; color: #e06c00; }
        .tag-share { background: #ebfff0; color: #1a9e45; }
        .tag-md { background: #f0f0ff; color: #5555cc; }
        .note-arrow { color: #ddd; font-size: 16px; flex-shrink: 0; }
        .empty { text-align: center; padding: 60px 20px; color: #bbb; font-size: 14px; }
        .highlight { background: #fff3cd; border-radius: 2px; }
        .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.4); align-items: center; justify-content: center; z-index: 100; }
        .modal-overlay.show { display: flex; }
        .modal { background: #fff; border-radius: 10px; padding: 22px; width: 300px; box-shadow: 0 8px 32px rgba(0,0,0,.15); }
        .modal h3 { font-size: 15px; margin-bottom: 14px; color: #333; }
        .modal input { width: 100%; padding: 9px 12px; border: 1px solid #dde1e7; border-radius: 6px; font-size: 14px; outline: none; margin-bottom: 6px; }
        .modal input:focus { border-color: #555; }
        .modal-hint { font-size: 12px; color: #999; margin-bottom: 14px; }
        .modal-btns { display: flex; gap: 8px; justify-content: flex-end; }
        .btn-cancel { padding: 7px 14px; border: 1px solid #dde1e7; border-radius: 6px; background: #fff; font-size: 13px; cursor: pointer; color: #666; }
        .btn-confirm { padding: 7px 14px; border: none; border-radius: 6px; background: #333; color: #fff; font-size: 13px; cursor: pointer; }
    </style>
</head>
<body>
<div class="topbar">
    <h1>📒 记事本</h1>
    <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" id="search-input" placeholder="搜索标题或内容…" oninput="handleSearch(this.value)">
    </div>
    <button class="btn-new" onclick="document.querySelector('.modal-overlay').classList.add('show')">+ 新建</button>
</div>

<div class="list">
    <div class="list-meta" id="list-meta">共 ${notes.length} 条记录</div>
    <div id="note-list">
        ${notes.length === 0 ? '<div class="empty">暂无记录，点击右上角新建</div>' : notes.map(n => `
        <a class="note-card" href="/${encodeURIComponent(n.key)}">
            <div class="note-icon ${n.pw ? 'locked' : n.share ? 'shared' : ''}">${n.pw ? '🔒' : n.share ? '🔗' : '📝'}</div>
            <div class="note-body">
                <div class="note-title">${n.key}</div>
                <div class="note-preview">${n.pw ? '已加密，需要密码才能查看' : (n.preview || '（空白记录）')}</div>
            </div>
            <div class="note-right">
                <span class="note-time">${n.timeAgo}</span>
                <div class="tags">
                    ${n.pw ? '<span class="tag tag-lock">加密</span>' : ''}
                    ${n.share ? '<span class="tag tag-share">已分享</span>' : ''}
                    ${n.mode === 'md' ? '<span class="tag tag-md">MD</span>' : ''}
                </div>
            </div>
            <span class="note-arrow">›</span>
        </a>
        `).join('')}
    </div>
</div>

<div class="modal-overlay" onclick="if(event.target===this)this.classList.remove('show')">
    <div class="modal">
        <h3>新建记录</h3>
        <input type="text" id="new-title" placeholder="输入标题，如：购物清单" oninput="updateHint(this.value)">
        <div class="modal-hint" id="new-hint">创建后跳转到对应页面开始编辑</div>
        <div class="modal-btns">
            <button class="btn-cancel" onclick="document.querySelector('.modal-overlay').classList.remove('show')">取消</button>
            <button class="btn-confirm" onclick="goNew()">确定，去编辑</button>
        </div>
    </div>
</div>

<script>
const allNotes = ${JSON.stringify(notes)};

function handleSearch(q) {
    q = q.trim().toLowerCase();
    const list = document.getElementById('note-list');
    const meta = document.getElementById('list-meta');
    if (!q) {
        renderNotes(allNotes);
        meta.textContent = '共 ' + allNotes.length + ' 条记录';
        return;
    }
    const filtered = allNotes.filter(n =>
        n.key.toLowerCase().includes(q) || (n.preview || '').toLowerCase().includes(q)
    );
    renderNotes(filtered, q);
    meta.textContent = '找到 ' + filtered.length + ' 条结果，关键词"' + q + '"';
}

function highlight(text, q) {
    if (!q) return text;
    return text.replace(new RegExp(q.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'gi'), m => '<span class="highlight">' + m + '</span>');
}

function renderNotes(notes, q) {
    const list = document.getElementById('note-list');
    if (notes.length === 0) {
        list.innerHTML = '<div class="empty">没有找到相关记录</div>';
        return;
    }
    list.innerHTML = notes.map(n => \`
    <a class="note-card" href="/\${encodeURIComponent(n.key)}">
        <div class="note-icon \${n.pw ? 'locked' : n.share ? 'shared' : ''}">\${n.pw ? '🔒' : n.share ? '🔗' : '📝'}</div>
        <div class="note-body">
            <div class="note-title">\${highlight(n.key, q)}</div>
            <div class="note-preview">\${n.pw ? '已加密，需要密码才能查看' : highlight(n.preview || '（空白记录）', q)}</div>
        </div>
        <div class="note-right">
            <span class="note-time">\${n.timeAgo}</span>
            <div class="tags">
                \${n.pw ? '<span class="tag tag-lock">加密</span>' : ''}
                \${n.share ? '<span class="tag tag-share">已分享</span>' : ''}
                \${n.mode === 'md' ? '<span class="tag tag-md">MD</span>' : ''}
            </div>
        </div>
        <span class="note-arrow">›</span>
    </a>
    \`).join('');
}

function updateHint(val) {
    const hint = document.getElementById('new-hint');
    hint.textContent = val.trim() ? '创建后跳转到 /' + val.trim() + ' 开始编辑' : '创建后跳转到对应页面开始编辑';
}

function goNew() {
    const title = document.getElementById('new-title').value.trim();
    if (!title) { alert('请输入标题'); return; }
    window.location.href = '/' + encodeURIComponent(title);
}
</script>
</body>
</html>
`
