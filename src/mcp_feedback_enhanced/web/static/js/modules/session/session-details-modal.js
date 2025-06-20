/**
 * MCP Feedback Enhanced - 會話詳情彈窗模組
 * =======================================
 * 
 * 負責會話詳情彈窗的創建、顯示和管理
 */

(function() {
    'use strict';

    // 確保命名空間存在
    window.MCPFeedback = window.MCPFeedback || {};
    window.MCPFeedback.Session = window.MCPFeedback.Session || {};

    const DOMUtils = window.MCPFeedback.Utils.DOM;
    const TimeUtils = window.MCPFeedback.Utils.Time;
    const StatusUtils = window.MCPFeedback.Utils.Status;

    /**
     * 會話詳情彈窗管理器
     */
    function SessionDetailsModal(options) {
        options = options || {};

        // 彈窗選項
        this.enableEscapeClose = options.enableEscapeClose !== false;
        this.enableBackdropClose = options.enableBackdropClose !== false;
        this.showFullSessionId = options.showFullSessionId || false;

        // 當前彈窗引用
        this.currentModal = null;
        this.keydownHandler = null;

        console.log('🔍 SessionDetailsModal 初始化完成');
    }

    /**
     * 顯示會話詳情
     */
    SessionDetailsModal.prototype.showSessionDetails = function(sessionData) {
        if (!sessionData) {
            this.showError('沒有可顯示的會話數據');
            return;
        }

        console.log('🔍 顯示會話詳情:', sessionData.session_id);

        // 關閉現有彈窗
        this.closeModal();

        // 格式化會話詳情
        const details = this.formatSessionDetails(sessionData);

        // 創建並顯示彈窗
        this.createAndShowModal(details);
    };

    /**
     * 格式化會話詳情
     */
    SessionDetailsModal.prototype.formatSessionDetails = function(sessionData) {
        console.log('🔍 格式化會話詳情:', sessionData);

        // 處理會話 ID - 顯示完整 session ID
        const sessionId = sessionData.session_id || '未知';

        // 處理建立時間
        const createdTime = sessionData.created_at ?
            TimeUtils.formatTimestamp(sessionData.created_at) :
            '未知';

        // 處理持續時間
        let duration = '進行中';
        if (sessionData.duration && sessionData.duration > 0) {
            duration = TimeUtils.formatDuration(sessionData.duration);
        } else if (sessionData.created_at && sessionData.completed_at) {
            const durationSeconds = sessionData.completed_at - sessionData.created_at;
            duration = TimeUtils.formatDuration(durationSeconds);
        } else if (sessionData.created_at) {
            const elapsed = TimeUtils.calculateElapsedTime(sessionData.created_at);
            if (elapsed > 0) {
                duration = TimeUtils.formatDuration(elapsed) + ' (進行中)';
            }
        }

        // 處理狀態
        const status = sessionData.status || 'waiting';
        const statusText = StatusUtils.getStatusText(status);
        const statusColor = StatusUtils.getStatusColor(status);

        return {
            sessionId: sessionId,
            status: statusText,
            statusColor: statusColor,
            createdTime: createdTime,
            duration: duration,
            projectDirectory: sessionData.project_directory || (window.i18nManager ? window.i18nManager.t('sessionManagement.sessionDetails.unknown') : '未知'),
            summary: sessionData.summary || (window.i18nManager ? window.i18nManager.t('sessionManagement.sessionDetails.noSummary') : '暫無摘要')
        };
    };

    /**
     * 創建並顯示彈窗
     */
    SessionDetailsModal.prototype.createAndShowModal = function(details) {
        // 創建彈窗 HTML
        const modalHtml = this.createModalHTML(details);

        // 插入到頁面中
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // 獲取彈窗元素
        this.currentModal = document.getElementById('sessionDetailsModal');

        // 設置事件監聽器
        this.setupEventListeners();

        // 添加顯示動畫
        this.showModal();
    };

    /**
     * 創建彈窗 HTML
     */
    SessionDetailsModal.prototype.createModalHTML = function(details) {
        const i18n = window.i18nManager;
        const title = i18n ? i18n.t('sessionManagement.sessionDetails.title') : '會話詳細資訊';
        const closeLabel = i18n ? i18n.t('sessionManagement.sessionDetails.close') : '關閉';
        const sessionIdLabel = i18n ? i18n.t('sessionManagement.sessionId') : '會話 ID';
        const statusLabel = i18n ? i18n.t('sessionManagement.status') : '狀態';

        return `
            <div class="session-details-modal" id="sessionDetailsModal">
                <div class="modal-backdrop"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close" id="closeSessionDetails" aria-label="${closeLabel}">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="detail-row">
                            <span class="detail-label">${sessionIdLabel}:</span>
                            <span class="detail-value session-id" title="${details.sessionId}">${details.sessionId}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">${statusLabel}:</span>
                            <span class="detail-value" style="color: ${details.statusColor};">${details.status}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">${i18n ? i18n.t('sessionManagement.createdTime') : '建立時間'}:</span>
                            <span class="detail-value">${details.createdTime}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">${i18n ? i18n.t('sessionManagement.sessionDetails.duration') : '持續時間'}:</span>
                            <span class="detail-value">${details.duration}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">${i18n ? i18n.t('sessionManagement.sessionDetails.projectDirectory') : '專案目錄'}:</span>
                            <span class="detail-value project-path" title="${details.projectDirectory}">${details.projectDirectory}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">${i18n ? i18n.t('sessionManagement.aiSummary') : 'AI 摘要'}:</span>
                            <div class="detail-value summary">${this.escapeHtml(details.summary)}</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" id="closeSessionDetailsBtn">${closeLabel}</button>
                    </div>
                </div>
            </div>
        `;
    };

    /**
     * 設置事件監聽器
     */
    SessionDetailsModal.prototype.setupEventListeners = function() {
        if (!this.currentModal) return;

        const self = this;

        // 關閉按鈕
        const closeBtn = this.currentModal.querySelector('#closeSessionDetails');
        const closeFooterBtn = this.currentModal.querySelector('#closeSessionDetailsBtn');

        if (closeBtn) {
            DOMUtils.addEventListener(closeBtn, 'click', function() {
                self.closeModal();
            });
        }

        if (closeFooterBtn) {
            DOMUtils.addEventListener(closeFooterBtn, 'click', function() {
                self.closeModal();
            });
        }

        // 背景點擊關閉
        if (this.enableBackdropClose) {
            const backdrop = this.currentModal.querySelector('.modal-backdrop');
            if (backdrop) {
                DOMUtils.addEventListener(backdrop, 'click', function() {
                    self.closeModal();
                });
            }
        }

        // ESC 鍵關閉
        if (this.enableEscapeClose) {
            this.keydownHandler = function(e) {
                if (e.key === 'Escape') {
                    self.closeModal();
                }
            };
            document.addEventListener('keydown', this.keydownHandler);
        }
    };

    /**
     * 顯示彈窗動畫
     */
    SessionDetailsModal.prototype.showModal = function() {
        if (!this.currentModal) return;

        // 添加顯示類觸發動畫
        requestAnimationFrame(() => {
            DOMUtils.safeAddClass(this.currentModal, 'show');
        });
    };

    /**
     * 關閉彈窗
     */
    SessionDetailsModal.prototype.closeModal = function() {
        if (!this.currentModal) return;

        // 移除鍵盤事件監聽器
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }

        // 添加關閉動畫
        DOMUtils.safeAddClass(this.currentModal, 'hide');

        // 延遲移除元素
        setTimeout(() => {
            if (this.currentModal) {
                DOMUtils.safeRemoveElement(this.currentModal);
                this.currentModal = null;
            }
        }, 300); // 與 CSS 動畫時間一致
    };

    /**
     * 顯示錯誤訊息
     */
    SessionDetailsModal.prototype.showError = function(message) {
        if (window.MCPFeedback && window.MCPFeedback.Utils && window.MCPFeedback.Utils.showMessage) {
            window.MCPFeedback.Utils.showMessage(message, 'error');
        } else {
            alert(message);
        }
    };

    /**
     * HTML 轉義
     */
    SessionDetailsModal.prototype.escapeHtml = function(text) {
        if (!text) return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    /**
     * 檢查是否有彈窗開啟
     */
    SessionDetailsModal.prototype.isModalOpen = function() {
        return this.currentModal !== null;
    };

    /**
     * 強制關閉所有彈窗
     */
    SessionDetailsModal.prototype.forceCloseAll = function() {
        // 關閉當前彈窗
        this.closeModal();

        // 清理可能遺留的彈窗元素
        const existingModals = document.querySelectorAll('.session-details-modal');
        existingModals.forEach(modal => {
            DOMUtils.safeRemoveElement(modal);
        });

        // 清理事件監聽器
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }

        this.currentModal = null;
    };

    /**
     * 清理資源
     */
    SessionDetailsModal.prototype.cleanup = function() {
        this.forceCloseAll();
        console.log('🔍 SessionDetailsModal 清理完成');
    };

    // 將 SessionDetailsModal 加入命名空間
    window.MCPFeedback.Session.DetailsModal = SessionDetailsModal;

    console.log('✅ SessionDetailsModal 模組載入完成');

})();
