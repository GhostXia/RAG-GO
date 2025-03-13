/**
 * 聊天记录实时收录模块
 */
class ChatRecorder {
    constructor(api) {
        this.api = api;
        this.isRecording = false;
        this.recordInterval = 5000; // 默认5秒记录一次
        this.lastMessageCount = 0;
        this.recordTimer = null;
    }

    /**
     * 初始化聊天记录收录功能
     */
    init() {
        // 添加聊天记录收录控制按钮
        $('#right-nav-panel .right_menu').append(
            `<div id="raggo_record_button" class="right_menu_button fa-solid fa-microphone" title="RAG-GO聊天记录收录"></div>`
        );

        // 绑定按钮事件
        $('#raggo_record_button').on('click', () => {
            this.toggleRecording();
        });

        // 添加设置项
        $('#raggo_settings').append(`
            <div class="raggo_setting_item">
                <label for="raggo_record_interval">聊天记录收录间隔(秒)</label>
                <input type="number" id="raggo_record_interval" min="1" max="60" value="${this.recordInterval/1000}">
            </div>
            <div class="raggo_setting_item">
                <label for="raggo_auto_record">自动开始收录</label>
                <input type="checkbox" id="raggo_auto_record">
            </div>
        `);

        // 绑定设置事件
        $('#raggo_record_interval').on('change', (e) => {
            const interval = parseInt($(e.target).val());
            if (interval >= 1 && interval <= 60) {
                this.recordInterval = interval * 1000;
                this.restartRecording();
            }
        });

        // 加载设置
        this.loadSettings();

        // 如果设置了自动开始收录，则启动收录
        if ($('#raggo_auto_record').is(':checked')) {
            this.startRecording();
        }
    }

    /**
     * 加载设置
     */
    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('raggo_settings') || '{}');
        if (settings.recordInterval) {
            this.recordInterval = settings.recordInterval;
            $('#raggo_record_interval').val(this.recordInterval / 1000);
        }
        if (settings.autoRecord !== undefined) {
            $('#raggo_auto_record').prop('checked', settings.autoRecord);
        }
    }

    /**
     * 保存设置
     */
    saveSettings() {
        const settings = JSON.parse(localStorage.getItem('raggo_settings') || '{}');
        settings.recordInterval = this.recordInterval;
        settings.autoRecord = $('#raggo_auto_record').is(':checked');
        localStorage.setItem('raggo_settings', JSON.stringify(settings));
    }

    /**
     * 切换记录状态
     */
    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    /**
     * 开始记录聊天
     */
    startRecording() {
        if (this.isRecording) return;

        this.isRecording = true;
        $('#raggo_record_button').addClass('active').attr('title', 'RAG-GO聊天记录收录中');
        toastr.info('聊天记录收录已开始', 'RAG-GO');

        // 记录当前消息数量
        this.lastMessageCount = this.getCurrentMessageCount();

        // 设置定时器，定期检查并记录新消息
        this.recordTimer = setInterval(() => this.checkAndRecordChat(), this.recordInterval);

        // 保存设置
        this.saveSettings();
    }

    /**
     * 停止记录聊天
     */
    stopRecording() {
        if (!this.isRecording) return;

        this.isRecording = false;
        $('#raggo_record_button').removeClass('active').attr('title', 'RAG-GO聊天记录收录');
        toastr.info('聊天记录收录已停止', 'RAG-GO');

        // 清除定时器
        if (this.recordTimer) {
            clearInterval(this.recordTimer);
            this.recordTimer = null;
        }

        // 保存设置
        this.saveSettings();
    }

    /**
     * 重新启动记录
     */
    restartRecording() {
        if (this.isRecording) {
            this.stopRecording();
            this.startRecording();
        }
    }

    /**
     * 获取当前消息数量
     */
    getCurrentMessageCount() {
        return $('#chat .mes').length;
    }

    /**
     * 检查并记录聊天
     */
    async checkAndRecordChat() {
        const currentCount = this.getCurrentMessageCount();
        
        // 如果消息数量没有变化，不需要记录
        if (currentCount <= this.lastMessageCount) {
            return;
        }

        // 获取当前聊天记录
        const chatHistory = this.getCurrentChatHistory();
        if (!chatHistory || chatHistory.messages.length === 0) {
            return;
        }

        try {
            // 上传聊天记录
            await this.api.post('/api/chat/upload', chatHistory);
            console.log('聊天记录已上传', chatHistory);
            
            // 更新最后记录的消息数量
            this.lastMessageCount = currentCount;
        } catch (error) {
            console.error('上传聊天记录失败:', error);
        }
    }

    /**
     * 获取当前聊天历史
     */
    getCurrentChatHistory() {
        // 获取当前角色名称
        const characterName = $('#selected_chat_pole').text().trim();
        
        // 获取所有消息元素
        const messages = [];
        $('#chat .mes').each((index, element) => {
            const $el = $(element);
            const role = $el.hasClass('user_mes') ? 'user' : 'assistant';
            const content = $el.find('.mes_text').text().trim();
            const time = $el.find('.mes_time').text().trim();
            
            messages.push({
                role: role,
                content: content,
                time: time
            });
        });

        // 创建聊天历史对象
        return {
            title: `与${characterName}的对话`,
            messages: messages,
            id: this.getChatId()
        };
    }

    /**
     * 获取当前聊天ID
     */
    getChatId() {
        // 尝试从URL或其他地方获取聊天ID
        const chatId = getRequestChatId(); // SillyTavern内置函数
        return chatId || `chat_${Date.now()}`;
    }
}

export default ChatRecorder;