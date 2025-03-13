import './style.css';
import settings from './settings.html';
import RAGGoAPI from './api.js';
import ChatRecorder from './chat_recorder.js';

/**
 * RAG-GO扩展主类
 */
class RAGGoExtension {
    constructor() {
        this.api = new RAGGoAPI();
        this.settings = {};
        this.documents = [];
    }

    /**
     * 初始化扩展
     */
    async init() {
        // 加载设置
        this.loadSettings();
        
        // 设置API基础URL
        if (this.settings.baseUrl) {
            this.api.setBaseUrl(this.settings.baseUrl);
        }

        // 注册设置UI
        this.registerSettings();
        
        // 注册聊天上下文增强功能
        this.registerContextEnhancement();
        
        // 注册文档管理UI
        this.registerDocumentManagement();
        
        // 初始化聊天记录收录功能
        this.chatRecorder = new ChatRecorder(this.api);
        this.chatRecorder.init();
        
        console.log('RAG-GO扩展已初始化');
    }

    /**
     * 加载设置
     */
    loadSettings() {
        const savedSettings = localStorage.getItem('raggo_settings');
        this.settings = savedSettings ? JSON.parse(savedSettings) : {
            baseUrl: 'http://localhost:8080',
            autoEnhance: true,
            resultLimit: 3,
        };
    }

    /**
     * 保存设置
     */
    saveSettings() {
        localStorage.setItem('raggo_settings', JSON.stringify(this.settings));
    }

    /**
     * 注册设置UI
     */
    registerSettings() {
        // 添加设置UI到SillyTavern
        $('#extensions_settings2').append(settings);
        
        // 绑定设置事件
        $('#raggo_base_url').val(this.settings.baseUrl).on('change', () => {
            this.settings.baseUrl = $('#raggo_base_url').val();
            this.api.setBaseUrl(this.settings.baseUrl);
            this.saveSettings();
        });
        
        $('#raggo_auto_enhance').prop('checked', this.settings.autoEnhance).on('change', () => {
            this.settings.autoEnhance = $('#raggo_auto_enhance').is(':checked');
            this.saveSettings();
        });
        
        $('#raggo_result_limit').val(this.settings.resultLimit).on('change', () => {
            this.settings.resultLimit = parseInt($('#raggo_result_limit').val());
            this.saveSettings();
        });
        
        // 测试连接按钮
        $('#raggo_test_connection').on('click', async () => {
            try {
                await this.api.listDocuments();
                toastr.success('连接成功', 'RAG-GO');
            } catch (error) {
                toastr.error(`连接失败: ${error.message}`, 'RAG-GO');
            }
        });
    }

    /**
     * 注册聊天上下文增强功能
     */
    registerContextEnhancement() {
        // 在发送消息前增强上下文
        const self = this;
        $(document).on('click', '#send_but, #send_textarea', async function() {
            if (!self.settings.autoEnhance) return;
            
            const userInput = $('#send_textarea').val();
            if (!userInput) return;
            
            try {
                // 搜索相关文档
                const results = await self.api.search(userInput, self.settings.resultLimit);
                if (results.length === 0) return;
                
                // 构建上下文增强信息
                let contextInfo = '\n\n[相关信息]\n';
                results.forEach((doc, index) => {
                    contextInfo += `${index + 1}. ${doc.content}\n`;
                });
                
                // 将上下文信息添加到系统提示中
                const currentSystemPrompt = extension_settings.system_prompt || '';
                extension_settings.system_prompt = currentSystemPrompt + contextInfo;
                
                // 显示通知
                toastr.info(`已添加${results.length}条相关信息到上下文`, 'RAG-GO');
            } catch (error) {
                console.error('RAG-GO上下文增强失败:', error);
            }
        });
    }

    /**
     * 注册文档管理UI
     */
    registerDocumentManagement() {
        // 添加文档管理按钮到SillyTavern界面
        $('#right-nav-panel .right_menu').append(
            `<div id="raggo_documents_button" class="right_menu_button fa-solid fa-book" title="RAG-GO文档管理"></div>`
        );
        
        // 创建文档管理对话框
        $('body').append(`
            <div id="raggo_documents_dialog" class="dialog" title="RAG-GO文档管理" style="display:none;">
                <div class="raggo_upload_section">
                    <h4>上传文档</h4>
                    <div class="flex-container">
                        <input type="text" id="raggo_doc_name" placeholder="文档名称" class="text_pole flex1">
                        <select id="raggo_doc_type" class="text_pole flex0">
                            <option value="text">文本</option>
                            <option value="webpage">网页</option>
                            <option value="pdf">PDF</option>
                        </select>
                    </div>
                    <textarea id="raggo_doc_content" placeholder="文档内容" class="text_pole" rows="5"></textarea>
                    <div class="flex-container">
                        <button id="raggo_upload_document" class="menu_button">上传文档</button>
                    </div>
                </div>
                <div class="raggo_documents_list">
                    <h4>文档列表</h4>
                    <div id="raggo_documents_container">
                        <div class="loading">加载中...</div>
                        <ul id="raggo_document_list"></ul>
                    </div>
                </div>
            </div>
        `);
        
        // 绑定文档管理对话框事件
        $('#raggo_documents_button').on('click', () => {
            this.openDocumentsDialog();
        });
        
        // 绑定上传文档事件
        $('#raggo_upload_document').on('click', async () => {
            const name = $('#raggo_doc_name').val();
            const content = $('#raggo_doc_content').val();
            const type = $('#raggo_doc_type').val();
            
            if (!name || !content) {
                toastr.error('文档名称和内容不能为空', 'RAG-GO');
                return;
            }
            
            try {
                await this.api.uploadDocument(name, content, type);
                toastr.success('文档上传成功', 'RAG-GO');
                
                // 清空表单
                $('#raggo_doc_name').val('');
                $('#raggo_doc_content').val('');
                
                // 刷新文档列表
                this.loadDocumentsList();
            } catch (error) {
                toastr.error(`上传失败: ${error.message}`, 'RAG-GO');
            }
        });
    }

    /**
     * 打开文档管理对话框
     */
    async openDocumentsDialog() {
        // 初始化对话框
        $('#raggo_documents_dialog').dialog({
            width: 600,
            height: 700,
            modal: true,
            resizable: true,
            close: () => {
                // 关闭对话框时的操作
            }
        });
        
        // 加载文档列表
        await this.loadDocumentsList();
    }

    /**
     * 加载文档列表
     */
    async loadDocumentsList() {
        const self = this;
        try {
            $('#raggo_documents_container .loading').show();
            $('#raggo_document_list').empty();
            
            this.documents = await this.api.listDocuments();
            
            if (this.documents.length === 0) {
                $('#raggo_document_list').html('<li class="no-documents">没有文档</li>');
            } else {
                this.documents.forEach(doc => {
                    $('#raggo_document_list').append(`
                        <li data-id="${doc.id}">
                            <div class="doc-info">
                                <span class="doc-name">${doc.name}</span>
                                <span class="doc-type">${doc.type}</span>
                            </div>
                            <button class="delete-btn" data-id="${doc.id}">删除</button>
                        </li>
                    `);
                });
                
                // 绑定删除按钮事件
                $('.delete-btn').on('click', async function() {
                    const docId = $(this).data('id');
                    try {
                        await self.api.deleteDocument(docId);
                        toastr.success('文档删除成功', 'RAG-GO');
                        
                        // 从列表中移除
                        $(`li[data-id="${docId}"]`).remove();
                        
                        // 如果列表为空，显示提示
                        if ($('#raggo_document_list li').length === 0) {
                            $('#raggo_document_list').html('<li class="no-documents">没有文档</li>');
                        }
                    } catch (error) {
                        toastr.error(`删除失败: ${error.message}`, 'RAG-GO');
                    }
                });
            }
            
            $('#raggo_documents_container .loading').hide();
        } catch (error) {
            toastr.error(`获取文档列表失败: ${error.message}`, 'RAG-GO');
            $('#raggo_documents_container .loading').hide();
        }
    }
}

// 创建并导出扩展实例
const raggoExtension = new RAGGoExtension();

// 注册扩展初始化函数
$(document).ready(function() {
    // 等待SillyTavern完全加载
    setTimeout(async function() {
        await raggoExtension.init();
    }, 1000);
});

export default raggoExtension;