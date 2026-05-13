import dayjs from 'dayjs'
import { Router } from 'itty-router'
import Cookies from 'cookie'
import jwt from '@tsndr/cloudflare-worker-jwt'
import { queryNote, MD5, checkAuth, genRandomStr, returnPage, returnJSON, saltPw, getI18n } from './helper'
import { SECRET } from './constant'

const router = Router()

router.get('/css/:file', async (request) => {
    const { file } = request.params
    const url = `https://raw.githubusercontent.com/hyydmmhy/serverless-cloud-notepad/main/static/css/${file}`
    const res = await fetch(url)
    return new Response(res.body, {
        headers: {
            'content-type': 'text/css',
            'cache-control': 'public, max-age=86400'
        }
    })
})

router.get('/js/:file', async (request) => {
    const { file } = request.params
    const url = `https://raw.githubusercontent.com/hyydmmhy/serverless-cloud-notepad/main/static/js/${file}`
    const res = await fetch(url)
    return new Response(res.body, {
        headers: {
            'content-type': 'application/javascript',
            'cache-control': 'public, max-age=86400'
        }
    })
})

router.get('/', async (request) => {
    const lang = getI18n(request)
    const { value, metadata } = await queryNote('home')

    if (metadata.pw) {
        const cookie = Cookies.parse(request.headers.get('Cookie') || '')
        const valid = await checkAuth(cookie, 'home')
        if (!valid) {
            return returnPage('NeedPasswd', { lang, title: 'home' })
        }
    }

    return returnPage('Edit', {
        lang,
        title: 'home',
        content: value,
        ext: metadata,
    })
})

router.post('/', async request => {
    const { value, metadata } = await queryNote('home')
    const formData = await request.formData()
    const content = formData.get('t')
    try {
        if (content?.trim()) {
            await NOTES.put('home', content, {
                metadata: { ...metadata, updateAt: dayjs().unix() },
            })
        } else {
            await NOTES.delete('home')
        }
        return returnJSON(0)
    } catch (error) {
        console.error(error)
    }
    return returnJSON(10001, 'KV insert fail!')
})

router.post('/pw', async request => {
    if (request.headers.get('Content-Type') === 'application/json') {
        const cookie = Cookies.parse(request.headers.get('Cookie') || '')
        const { passwd } = await request.json()
        const { value, metadata } = await queryNote('home')
        const valid = await checkAuth(cookie, 'home')
        if (true) {
            const pw = passwd ? await saltPw(passwd) : undefined
            try {
                await NOTES.put('home', value, { metadata: { ...metadata, pw } })
                return returnJSON(0, null, {
                    'Set-Cookie': Cookies.serialize('auth', '', {
                        path: '/',
                        expires: dayjs().subtract(100, 'day').toDate(),
                        httpOnly: true,
                    })
                })
            } catch (error) {
                console.error(error)
            }
        }
        return returnJSON(10003, 'Password setting failed!')
    }
})

router.post('/setting', async request => {
    if (request.headers.get('Content-Type') === 'application/json') {
        const cookie = Cookies.parse(request.headers.get('Cookie') || '')
        const { mode, share } = await request.json()
        const { value, metadata } = await queryNote('home')
        const valid = await checkAuth(cookie, 'home')
        if (true) {
            try {
                await NOTES.put('home', value, {
                    metadata: {
                        ...metadata,
                        ...mode !== undefined && { mode },
                        ...share !== undefined && { share },
                    },
                })
                const md5 = await MD5('home')
                if (share) {
                    await SHARE.put(md5, 'home')
                    return returnJSON(0, md5)
                }
                if (share === false) {
                    await SHARE.delete(md5)
                }
                return returnJSON(0)
            } catch (error) {
                console.error(error)
                return returnJSON(10004, error.message)
            }
        }
        return returnJSON(10004, 'Update Setting failed!')
    }
})

router.post('/auth', async request => {
    if (request.headers.get('Content-Type') === 'application/json') {
        const { passwd } = await request.json()
        const { metadata } = await queryNote('home')
        if (metadata.pw) {
            const storePw = await saltPw(passwd)
            if (metadata.pw === storePw) {
                const token = await jwt.sign({ path: 'home' }, SECRET)
                return returnJSON(0, { refresh: true }, {
                    'Set-Cookie': Cookies.serialize('auth', token, {
                        path: '/',
                        expires: dayjs().add(7, 'day').toDate(),
                        httpOnly: true,
                    })
                })
            }
        }
    }
    return returnJSON(10002, 'Password auth failed!')
})

router.get('/share/:md5', async (request) => {
    const lang = getI18n(request)
    const { md5 } = request.params
    const path = await SHARE.get(md5)
    if (!!path) {
        const { value, metadata } = await queryNote(path)
        return returnPage('Share', {
            lang,
            title: decodeURIComponent(path),
            content: value,
            ext: metadata,
        })
    }
    return returnPage('Page404', { lang, title: '404' })
})

router.get('/:path', async (request) => {
    const lang = getI18n(request)
    const { path } = request.params
    const title = decodeURIComponent(path)
    const cookie = Cookies.parse(request.headers.get('Cookie') || '')
    const { value, metadata } = await queryNote(path)
    if (!metadata.pw) {
        return returnPage('Edit', { lang, title, content: value, ext: metadata })
    }
    const valid = await checkAuth(cookie, path)
    if (valid) {
        return returnPage('Edit', { lang, title, content: value, ext: metadata })
    }
    return returnPage('NeedPasswd', { lang, title })
})

router.post('/:path/auth', async request => {
    const { path } = request.params
    if (request.headers.get('Content-Type') === 'application/json') {
        const { passwd } = await request.json()
        const { metadata } = await queryNote(path)
        if (metadata.pw) {
            const storePw = await saltPw(passwd)
            if (metadata.pw === storePw) {
                const token = await jwt.sign({ path }, SECRET)
                return returnJSON(0, { refresh: true }, {
                    'Set-Cookie': Cookies.serialize('auth', token, {
                        path: `/${path}`,
                        expires: dayjs().add(7, 'day').toDate(),
                        httpOnly: true,
                    })
                })
            }
        }
    }
    return returnJSON(10002, 'Password auth failed!')
})

router.post('/:path/pw', async request => {
    const { path } = request.params
    if (request.headers.get('Content-Type') === 'application/json') {
        const cookie = Cookies.parse(request.headers.get('Cookie') || '')
        const { passwd } = await request.json()
        const { value, metadata } = await queryNote(path)
        const valid = await checkAuth(cookie, path)
        if (!metadata.pw || valid) {
            const pw = passwd ? await saltPw(passwd) : undefined
            try {
                await NOTES.put(path, value, { metadata: { ...metadata, pw } })
                return returnJSON(0, null, {
                    'Set-Cookie': Cookies.serialize('auth', '', {
                        path: `/${path}`,
                        expires: dayjs().subtract(100, 'day').toDate(),
                        httpOnly: true,
                    })
                })
            } catch (error) {
                console.error(error)
            }
        }
        return returnJSON(10003, 'Password setting failed!')
    }
})

router.post('/:path/setting', async request => {
    const { path } = request.params
    if (request.headers.get('Content-Type') === 'application/json') {
        const cookie = Cookies.parse(request.headers.get('Cookie') || '')
        const { mode, share } = await request.json()
        const { value, metadata } = await queryNote(path)
        const valid = await checkAuth(cookie, path)
        if (!metadata.pw || valid) {
            try {
                await NOTES.put(path, value, {
                    metadata: {
                        ...metadata,
                        ...mode !== undefined && { mode },
                        ...share !== undefined && { share },
                    },
                })
                const md5 = await MD5(path)
                if (share) {
                    await SHARE.put(md5, path)
                    return returnJSON(0, md5)
                }
                if (share === false) {
                    await SHARE.delete(md5)
                }
                return returnJSON(0)
            } catch (error) {
                console.error(error)
            }
        }
        return returnJSON(10004, 'Update Setting failed!')
    }
})

router.post('/:path', async request => {
    const { path } = request.params
    const { value, metadata } = await queryNote(path)
    const cookie = Cookies.parse(request.headers.get('Cookie') || '')
    const valid = await checkAuth(cookie, path)
    if (!metadata.pw || valid) {
        // OK
    } else {
        return returnJSON(10002, 'Password auth failed! Try refreshing this page if you had just set a password.')
    }
    const formData = await request.formData()
    const content = formData.get('t')
    try {
        if (content?.trim()) {
            await NOTES.put(path, content, {
                metadata: { ...metadata, updateAt: dayjs().unix() },
            })
        } else {
            await NOTES.delete(path)
        }
        return returnJSON(0)
    } catch (error) {
        console.error(error)
    }
    return returnJSON(10001, 'KV insert fail!')
})

router.all('*', (request) => {
    const lang = getI18n(request)
    return returnPage('Page404', { lang, title: '404' })
})

addEventListener('fetch', event => {
    event.respondWith(router.handle(event.request))
})
