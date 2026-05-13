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
    <div id="search-bar" style="position:sticky;top:0;z-index:99;background:#fff;border-bottom:1px solid #dde1e7;padding:8px 12px;align-items:center;gap:8px;display:none;">
        <span style="color:#999;font-size:13px;">🔍</span>
        <input id="search-input" type="text" placeholder="搜索内容…" style="flex:1;border:1px solid #dde1e7;border-radius:5px;padding:6px 10px;font-size:14px;outline:none;background:#f5f7fa;" />
        <span id="search-count" style="font-size:12px;color:#999;white-space:nowrap;"></span>
        <button id="search-prev" style="padding:4px 10px;border:1px solid #dde1e7;border-radius:4px;background:#fff;cursor:pointer;font-size:13px;">↑</button>
        <button id="search-next" style="padding:4px 10px;border:1px solid #dde1e7;border-radius:4px;background:#fff;cursor:pointer;font-size:13px;">↓</button>
        <button id="search-close" style="padding:4px 10px;border:1px solid #dde1e7;border-radius:4px;background:#fff;cursor:pointer;font-size:13px;color:#999;">✕</button>
    </div>
    <div class="note-container">
        <div class="stack">
            <div class="layer_1">
                <div class="layer_2">
                    <div class="layer_3">
                        ${tips ? `<div class="tips">${tips}</div>` : ''}
                        <textarea id="contents" class="contents ${isEdit ? '' : 'hide'}" spellcheck="true" placeholder="${SUPPORTED_LANG[lang].emptyPH}">${content}</textarea>
                        ${(isEdit && ext.mode === 'md') ? '<div class="divide-line"></div>' : ''}
                        ${tips ? '' : `<div id="preview-${ext.mode || 'plain'}" class="contents ${(isEdit && ext.mode !== 'md') ? 'hide' : ''}"></div>`}
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div id="loading"></div>
    ${MODAL(lang)}
    ${FOOTER({ ...ext, isEdit, lang })}
    <script src="${CDN_PREFIX}/js/purify.min.js"></script>
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
