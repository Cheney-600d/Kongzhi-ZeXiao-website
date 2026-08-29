# -*- coding: utf-8 -*-
"""为首页、院校详情和内容后台生成视觉 QA 截图与布局指标。"""
from __future__ import annotations

import json
import pathlib

from playwright.sync_api import sync_playwright


ROOT = pathlib.Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'design-output' / 'qa'
BASE = 'http://127.0.0.1:8767'


def install_exam_fixture(page):
    payload = {
        'code': 0,
        'data': {'items': [
            {
                'id': 1, 'type': 'link', 'title': '领取真题资料',
                'description': '百度云免费领取真题资料。',
                'link_url': '链接:https://pan.baidu.com/s/example?pwd=569a 备用群：1040895703；',
                'config': {'cta': '领取资料'},
            },
            {
                'id': 2, 'type': 'video', 'title': '真题配套讲解',
                'link_url': 'https://www.bilibili.com/video/BV1demo01',
                'config': {'video_items': [
                    {'url': 'https://www.bilibili.com/video/BV1demo01', 'title': '第一讲｜真题题型与分值结构', 'platform': '哔哩哔哩', 'duration': '18:42'},
                    {'url': 'https://www.bilibili.com/video/BV1demo02', 'title': '第二讲｜高频考点配套讲解', 'platform': '哔哩哔哩', 'duration': '26:15'},
                    {'url': 'https://www.bilibili.com/video/BV1demo03', 'title': '第三讲｜历年真题复盘', 'platform': '哔哩哔哩', 'duration': '31:06'},
                ]},
            },
        ]},
    }
    page.route(
        '**/api/exam-resources',
        lambda route: route.fulfill(status=200, content_type='application/json', body=json.dumps(payload, ensure_ascii=False)),
    )


def metrics(page):
    return page.evaluate(
        """() => ({
          width: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          height: document.documentElement.clientHeight,
          scrollHeight: document.documentElement.scrollHeight,
          overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          title: document.title
        })"""
    )


def capture_page(page, url, screenshot_name, wait_selector=None, scroll_selector=None):
    errors = []
    page.on('pageerror', lambda error: errors.append(f'pageerror: {error}'))
    page.on('console', lambda message: errors.append(f'console: {message.text}') if message.type == 'error' else None)
    if '/index.html' in url:
        page.add_init_script("sessionStorage.setItem('control_school_white_intro_seen_v1','1')")
    page.goto(url, wait_until='domcontentloaded', timeout=30_000)
    if wait_selector:
        try:
            page.locator(wait_selector).first.wait_for(state='attached', timeout=6_000)
        except Exception as error:
            errors.append(f'missing selector {wait_selector}: {error}')
    page.wait_for_timeout(900)
    if scroll_selector and page.locator(scroll_selector).count():
        page.locator(scroll_selector).first.evaluate(
            "node => node.scrollIntoView({block: 'start', inline: 'nearest'})"
        )
        page.evaluate("window.scrollBy(0, -72)")
        page.wait_for_timeout(400)
    path = OUTPUT / screenshot_name
    page.screenshot(path=str(path), full_page=False)
    return {'screenshot': str(path), 'metrics': metrics(page), 'errors': errors}


def login_admin(page):
    page.goto(f'{BASE}/数据库/admin.html', wait_until='domcontentloaded', timeout=30_000)
    page.locator('#loginUsername').fill('admin')
    page.locator('#loginPassword').fill('admin123')
    page.locator('#loginForm button[type="submit"]').click()
    page.locator('#modulesView').wait_for(state='visible', timeout=20_000)
    page.locator('.module-card').first.wait_for(state='visible', timeout=20_000)
    page.wait_for_timeout(500)


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    report = {}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)

        desktop = browser.new_page(viewport={'width': 1488, 'height': 1054}, device_scale_factor=1)
        report['home_desktop'] = capture_page(
            desktop, f'{BASE}/index.html', 'home-desktop.png', '.journey-action'
        )
        desktop.locator('[data-stage-tab="target"]').click()
        desktop.wait_for_timeout(250)
        report['home_stage_interaction'] = {
            'pressed': desktop.locator('[data-stage-tab="target"]').get_attribute('aria-pressed'),
            'title': desktop.locator('[data-task-title]').inner_text(),
        }
        desktop.locator('[data-stage-tab="retest"]').click()
        desktop.wait_for_timeout(250)
        report['employment_stage'] = {
            'title': desktop.locator('[data-task-title]').inner_text(),
            'primaryHref': desktop.locator('[data-task-primary]').get_attribute('href'),
        }
        desktop.locator('[data-stage-tab="review"]').click()
        desktop.wait_for_timeout(250)
        report['review_stage'] = {
            'primaryText': desktop.locator('[data-task-primary-label]').inner_text(),
            'primaryHref': desktop.locator('[data-task-primary]').get_attribute('href'),
        }
        desktop.close()

        results = browser.new_page(viewport={'width': 2048, 'height': 1152}, device_scale_factor=1)
        report['home_results_desktop'] = capture_page(
            results,
            f'{BASE}/index.html',
            'home-results-desktop.png',
            '#schoolTable tr',
            '#mainContentArea',
        )
        report['home_results_layout'] = results.evaluate(
            """() => {
              const main = document.querySelector('#mainContentArea > div');
              const list = main && main.children[0];
              const rail = main && main.children[1];
              const entry = document.querySelector('.bilibili-entry--desktop');
              const avatar = entry && entry.querySelector('.bilibili-entry__avatar');
              const box = node => node ? ({
                width: Math.round(node.getBoundingClientRect().width),
                height: Math.round(node.getBoundingClientRect().height),
                left: Math.round(node.getBoundingClientRect().left),
                right: Math.round(node.getBoundingClientRect().right)
              }) : null;
              return {main: box(main), list: box(list), rail: box(rail), entry: box(entry), avatar: box(avatar)};
            }"""
        )
        results.close()

        mobile = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
        report['home_mobile'] = capture_page(
            mobile, f'{BASE}/index.html', 'home-mobile.png', '.journey-action'
        )
        report['home_mobile_resource_layout'] = mobile.evaluate(
            """() => {
              const entry = document.querySelector('.bilibili-entry--mobile');
              const avatar = entry && entry.querySelector('.bilibili-entry__avatar');
              const desktopEntry = document.querySelector('.bilibili-entry--desktop');
              const box = node => node ? ({
                display: getComputedStyle(node).display,
                width: Math.round(node.getBoundingClientRect().width),
                height: Math.round(node.getBoundingClientRect().height)
              }) : null;
              return {entry: box(entry), avatar: box(avatar), desktopEntry: box(desktopEntry)};
            }"""
        )
        mobile.close()

        detail = browser.new_page(viewport={'width': 1536, 'height': 1200}, device_scale_factor=1)
        report['detail_desktop'] = capture_page(
            detail,
            f'{BASE}/index.html?school=上海交通大学&uiView=school-detail',
            'school-detail-inline-desktop.png',
            '.school-content-section--embedded .school-module',
            '#schoolContentModules',
        )
        report['detail_modules'] = detail.locator('.school-module').count()
        detail_section = detail.locator('#schoolContentModules')
        report['detail_hidden'] = detail_section.count() == 0 or detail_section.get_attribute('hidden') is not None
        report['detail_inline_placement'] = detail.evaluate(
            """() => {
              const section = document.querySelector('#schoolContentModules');
              const data = section && section.nextElementSibling;
              return {embedded: !!section?.classList.contains('school-content-section--embedded'), nextIsDataCard: !!data?.classList.contains('card')};
            }"""
        )
        report['detail_video_layout'] = detail.evaluate(
            """() => {
              const card = document.querySelector('.school-content-section--embedded .school-module--video');
              const image = card && card.querySelector('.school-module__media img');
              const box = node => node ? ({width: Math.round(node.getBoundingClientRect().width), height: Math.round(node.getBoundingClientRect().height)}) : null;
              return {card: box(card), image: box(image), objectFit: image ? getComputedStyle(image).objectFit : null};
            }"""
        )
        detail.close()

        detail_mobile = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
        report['detail_mobile'] = capture_page(
            detail_mobile,
            f'{BASE}/index.html?school=上海交通大学&uiView=school-detail',
            'school-detail-inline-mobile.png',
            '.school-content-section--embedded .school-module',
            '#schoolContentModules',
        )
        detail_mobile.close()

        exam_context = browser.new_context(
            viewport={'width': 1440, 'height': 1050}, device_scale_factor=1,
            permissions=['clipboard-read', 'clipboard-write'],
        )
        exam = exam_context.new_page()
        install_exam_fixture(exam)
        report['exam_desktop'] = capture_page(
            exam, f'{BASE}/真题备考区.html', 'exam-resources-desktop.png', '.video-link-item', '#resourceBoard'
        )
        exam.locator('#resourceBoard').screenshot(path=str(OUTPUT / 'exam-resource-board-desktop.png'))
        report['exam_resource_board_desktop'] = {'screenshot': str(OUTPUT / 'exam-resource-board-desktop.png')}
        report['exam_sections'] = {
            'resourceTitle': exam.locator('#resourceTitle').inner_text(),
            'videoTitle': exam.locator('#videoTitle').inner_text(),
            'resourceHref': exam.locator('.resource-card__actions a').get_attribute('href'),
            'videoLinks': exam.locator('.video-link-item').count(),
        }
        exam.locator('.resource-card__actions button').click()
        report['exam_sections']['copiedLink'] = exam.evaluate('navigator.clipboard.readText()')
        exam.locator('#videoBoard').screenshot(path=str(OUTPUT / 'exam-video-list-desktop.png'))
        report['exam_video_list_desktop'] = {'screenshot': str(OUTPUT / 'exam-video-list-desktop.png')}
        exam.close()
        exam_context.close()

        exam_mobile_context = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
        exam_mobile = exam_mobile_context.new_page()
        install_exam_fixture(exam_mobile)
        report['exam_mobile'] = capture_page(
            exam_mobile, f'{BASE}/真题备考区.html', 'exam-resources-mobile.png', '.video-link-item', '#resourceBoard'
        )
        exam_mobile.locator('#resourceBoard').screenshot(path=str(OUTPUT / 'exam-resource-board-mobile.png'))
        report['exam_resource_board_mobile'] = {'screenshot': str(OUTPUT / 'exam-resource-board-mobile.png')}
        exam_mobile.locator('#videoBoard').screenshot(path=str(OUTPUT / 'exam-video-list-mobile.png'))
        report['exam_video_list_mobile'] = {'screenshot': str(OUTPUT / 'exam-video-list-mobile.png')}
        exam_mobile.close()
        exam_mobile_context.close()

        login_page = browser.new_page(viewport={'width': 1536, 'height': 1024}, device_scale_factor=1)
        report['admin_login'] = capture_page(
            login_page, f'{BASE}/数据库/admin.html', 'admin-login.png', '#loginForm'
        )
        login_admin(login_page)
        login_page.screenshot(path=str(OUTPUT / 'admin-desktop.png'), full_page=False)
        report['admin_desktop'] = {
            'screenshot': str(OUTPUT / 'admin-desktop.png'),
            'metrics': metrics(login_page),
            'modules': login_page.locator('.module-card').count(),
            'schoolOptions': login_page.locator('#schoolSelect option').count(),
        }
        login_page.locator('#contentScope').select_option('exam')
        login_page.wait_for_timeout(500)
        login_page.screenshot(path=str(OUTPUT / 'admin-exam-scope.png'), full_page=False)
        report['admin_exam_scope'] = {
            'screenshot': str(OUTPUT / 'admin-exam-scope.png'),
            'breadcrumb': login_page.locator('#contentBreadcrumb').inner_text(),
            'schoolHidden': login_page.locator('#schoolSelectLabel').is_hidden(),
            'publicHref': login_page.locator('#publicPreviewLink').get_attribute('href'),
        }
        exam_video_card = login_page.locator('.module-card[data-type="video"]')
        if exam_video_card.count():
            exam_video_card.first.click()
            login_page.wait_for_timeout(250)
            login_page.screenshot(path=str(OUTPUT / 'admin-exam-video-list.png'), full_page=False)
            report['admin_exam_video_list'] = {
                'screenshot': str(OUTPUT / 'admin-exam-video-list.png'),
                'listVisible': login_page.locator('#examVideoListFields').is_visible(),
                'singleVideoHidden': login_page.locator('#videoFields').is_hidden(),
                'coverHidden': login_page.locator('#coverFields').is_hidden(),
                'configuredUrls': len([line for line in login_page.locator('#fieldVideoList').input_value().splitlines() if line.strip()]),
            }
        login_page.close()

        admin_mobile = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
        login_admin(admin_mobile)
        admin_mobile.screenshot(path=str(OUTPUT / 'admin-mobile.png'), full_page=False)
        report['admin_mobile'] = {
            'screenshot': str(OUTPUT / 'admin-mobile.png'),
            'metrics': metrics(admin_mobile),
        }
        admin_mobile.close()

        browser.close()

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
