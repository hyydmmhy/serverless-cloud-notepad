
const DEFAULT_LANG = 'en'
const SUPPORTED_LANG = {
    'en': {
        err: 'Error',
        pepw: 'Please enter password.',
        pwcnbe: 'Password is empty!',
        enpw: 'Enter a new password(Keeping it empty will remove the current password)',
        pwss: 'Password set successfully.',
        pwrs: 'Password removed successfully.',
        cpys: 'Copied!',
    },
    'zh': {
        err: '出错了',
        pepw: '请输入密码',
        pwcnbe: '密码不能为空！',
        enpw: '输入新密码（留空可清除当前密码）',
        pwss: '密码设置成功！',
        pwrs: '密码清除成功！',
        cpys: '已复制',
    }
}

const getI18n = key => {
    const userLang = (navigator.language || navigator.userLanguage || DEFAULT_LANG).split('-')[0]
    const targetLang = Object.keys(SUPPORTED_LANG).find(l => l === userLang) || DEFAULT_LANG
    return SUPPORTED_LANG[targetLang][key]
}

const errHandle = (err) => {
    alert(`${getI18n('err')}: ${err}`)
}

const throttle = (func, delay) => {
    let tid = null

    return (...arg) => {
        if (tid) return;

        tid = setTimeout(() => {
            func(...arg)
            tid = null
        }, delay)
    }
}

const passwdPrompt = () => {
    const passwd = window.prompt(getI18n('pepw'))
    if (passwd == null) return;

    if (!passwd.trim()) {
        alert(getI18n('pwcnbe'))
    }
    const path = location.pathname.replace(/\/$/, '') || ''
    window.fetch(`${path}/auth`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            passwd,
        }),
    })
        .then(res => res.json())
        .then(res => {
            if (res.err !== 0) {
                return errHandle(res.msg)
            }
            if (res.data.refresh) {
                window.location.reload()
            }
        })
        .catch(err => errHandle(err))
}

const renderPlain = (node, text) => {
    if (node) {
        node.innerHTML = DOMPurify.sanitize(text)
    }
}

const renderMarkdown = (node, text) => {
    if (node) {
        const parseText = marked.parse(text)
        node.innerHTML = DOMPurify.sanitize(parseText)
    }
}

window.addEventListener('DOMContentLoaded', function () {
    const $textarea = document.querySelector('#contents')
    const $loading = document.querySelector('#loading')
    const $pwBtn = document.querySelector('.opt-pw')
    const $modeBtn = document.querySelector('.opt-mode > input')
    const $shareBtn = document.querySelector('.opt-share > input')
    const $previewPlain = document.querySelector('#preview-plain')
    const $previewMd = document.querySelector('#preview-md')
    const $shareModal = document.querySelector('.share-modal')
    const $closeBtn = document.querySelector('.share-modal .close-btn')
    const $copyBtn = document.querySelector('.share-modal .opt-button')
    const $shareInput = document.querySelector('.share-modal input')

    // 搜索功能
    const $searchBar = document.querySelector('#search-bar')
    const $searchInput = document.querySelector('#search-input')
    const $searchCount = document.querySelector('#search-count')
    const $searchPrev = document.querySelector('#search-prev')
    const $searchNext = document.querySelector('#search-next')
    const $searchClose = document.querySelector('#search-close')

    let searchMatches = []
    let searchIndex = 0

    function openSearch() {
        $searchBar.style.display = 'flex'
        $searchInput.focus()
        $searchInput.select()
    }

    function closeSearch() {
        $searchBar.style.display = 'none'
        $searchInput.value = ''
        clearHighlight()
        searchMatches = []
        $searchCount.textContent = ''
    }

    function clearHighlight() {
        if ($previewPlain) {
            $previewPlain.innerHTML = DOMPurify.sanitize($textarea ? $textarea.value : $previewPlain.textContent)
        }
    }

    function doSearch(q) {
        if (!$previewPlain) return
        const text = $textarea ? $textarea.value : ''
        if (!q) {
            $previewPlain.innerHTML = DOMPurify.sanitize(text)
            $searchCount.textContent = ''
            searchMatches = []
            return
        }
        const lower = text.toLowerCase()
        const lowerQ = q.toLowerCase()
        searchMatches = []
        let idx = 0
        while ((idx = lower.indexOf(lowerQ, idx)) !== -1) {
            searchMatches.push(idx)
            idx++
        }
        if (searchMatches.length === 0) {
            $searchCount.textContent = '无结果'
            $previewPlain.innerHTML = DOMPurify.sanitize(text)
            return
        }
        searchIndex = 0
        $searchCount.textContent = '1 / ' + searchMatches.length
        renderHighlight(text, q)
        scrollToMatch()
    }

    function renderHighlight(text, q) {
        if (!$previewPlain) return
        var result = ''
        var last = 0
        var lq = q.toLowerCase()
        var lt = text.toLowerCase()
        var i = 0
        while (true) {
            var pos = lt.indexOf(lq, last)
            if (pos === -1) break
            result += DOMPurify.sanitize(text.slice(last, pos))
            var cls = i === searchIndex ? 'search-current' : 'search-hit'
            result += '<mark class="' + cls + '">' + DOMPurify.sanitize(text.slice(pos, pos + q.length)) + '</mark>'
            last = pos + q.length
            i++
        }
        result += DOMPurify.sanitize(text.slice(last))
        $previewPlain.innerHTML = result
    }

    function scrollToMatch() {
        var marks = $previewPlain ? $previewPlain.querySelectorAll('mark') : []
        if (marks[searchIndex]) {
            marks[searchIndex].scrollIntoView({ block: 'center' })
        }
    }

    if ($searchInput) {
        $searchInput.addEventListener('input', function () {
            searchIndex = 0
            doSearch($searchInput.value)
        })
        $searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.shiftKey ? prevMatch() : nextMatch()
            }
            if (e.key === 'Escape') closeSearch()
        })
    }

    function nextMatch() {
        if (!searchMatches.length) return
        searchIndex = (searchIndex + 1) % searchMatches.length
        $searchCount.textContent = (searchIndex + 1) + ' / ' + searchMatches.length
        renderHighlight($textarea ? $textarea.value : '', $searchInput.value)
        scrollToMatch()
    }

    function prevMatch() {
        if (!searchMatches.length) return
        searchIndex = (searchIndex - 1 + searchMatches.length) % searchMatches.length
        $searchCount.textContent = (searchIndex + 1) + ' / ' + searchMatches.length
        renderHighlight($textarea ? $textarea.value : '', $searchInput.value)
        scrollToMatch()
    }

    if ($searchNext) $searchNext.onclick = nextMatch
    if ($searchPrev) $searchPrev.onclick = prevMatch
    if ($searchClose) $searchClose.onclick = closeSearch

    // Ctrl+F 或 Cmd+F 打开搜索
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault()
            openSearch()
        }
    })

    // 添加高亮样式
    var style = document.createElement('style')
    style.textContent = 'mark.search-hit{background:#fff3cd;border-radius:2px;padding:0 1px;color:inherit;} mark.search-current{background:#ff9800;border-radius:2px;padding:0 1px;color:#fff;}'
    document.head.appendChild(style)

    renderPlain($previewPlain, $textarea.value)
    renderMarkdown($previewMd, $textarea.value)

    if ($textarea) {
        $textarea.oninput = throttle(function () {
            renderMarkdown($previewMd, $textarea.value)

            $loading.style.display = 'inline-block'
            const data = {
                t: $textarea.value,
            }

            window.fetch('', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(data),
            })
                .then(res => res.json())
                .then(res => {
                    if (res.err !== 0) {
                        errHandle(res.msg)
                    }
                })
                .catch(err => errHandle(err))
                .finally(() => {
                    $loading.style.display = 'none'
                })
        }, 1000)
    }

    if ($pwBtn) {
        $pwBtn.onclick = function () {
            const passwd = window.prompt(getI18n('enpw'))
            if (passwd == null) return;

            const path = window.location.pathname.replace(/\/$/, '')
            window.fetch(`${path}/pw`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    passwd: passwd.trim(),
                }),
            })
                .then(res => res.json())
                .then(res => {
                    if (res.err !== 0) {
                        return errHandle(res.msg)
                    }
                    alert(passwd ? getI18n('pwss') : getI18n('pwrs'))
                })
                .catch(err => errHandle(err))
        }
    }

    if ($modeBtn) {
        $modeBtn.onclick = function (e) {
            const isMd = e.target.checked
            const path = window.location.pathname.replace(/\/$/, '')
            window.fetch(`${path}/setting`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mode: isMd ? 'md' : 'plain',
                }),
            })
                .then(res => res.json())
                .then(res => {
                    if (res.err !== 0) {
                        return errHandle(res.msg)
                    }

                    window.location.reload()
                })
                .catch(err => errHandle(err))
        }
    }

    if ($shareBtn) {
        $shareBtn.onclick = function (e) {
            const isShare = e.target.checked
            const path = window.location.pathname.replace(/\/$/, '')
            window.fetch(`${path}/setting`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    share: isShare,
                }),
            })
                .then(res => res.json())
                .then(res => {
                    if (res.err !== 0) {
                        return errHandle(res.msg)
                    }

                    if (isShare) {
                        const origin = window.location.origin
                        const url = `${origin}/share/${res.data}`
                        // show modal
                        $shareInput.value = url
                        $shareModal.style.display = 'block'
                    }
                })
                .catch(err => errHandle(err))
        }
    }

    if ($shareModal) {
        $closeBtn.onclick = function () {
            $shareModal.style.display = 'none'

        }
        $copyBtn.onclick = function () {
            clipboardCopy($shareInput.value)
            const originText = $copyBtn.innerHTML
            const originColor = $copyBtn.style.background
            $copyBtn.innerHTML = getI18n('cpys')
            $copyBtn.style.background = 'orange'
            window.setTimeout(() => {
                $shareModal.style.display = 'none'
                $copyBtn.innerHTML = originText
                $copyBtn.style.background = originColor
            }, 1500)
        }
    }

})
