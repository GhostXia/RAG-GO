# RAG-GO SillyTavern 扩展设计方案

基于对SillyTavern WebLLM扩展的分析，我们可以设计一个类似的RAG-GO扩展，实现SillyTavern与RAG-GO的无缝集成。这种方式比直接使用DataBank API更加灵活和用户友好。

## 1. 扩展架构

### 1.1 总体架构

```
Extension-RAG-GO/
├── dist/                  # 编译后的JavaScript文件
├── src/                   # 源代码
│   ├── index.js           # 扩展主入口
│   ├── settings.html      # 设置界面
│   ├── style.css          # 样式表
│   └── api.js             # RAG-GO API封装
├── manifest.json          # 扩展清单
├── package.json           # NPM包配置
└── README.md              # 说明文档
```

### 1.2 通信流程

```
+----------------+      HTTP API      +-------------+
|                |<----------------->|             |
| SillyTavern    |                   |   RAG-GO    |
| (Extension)    |                   |   服务      |
|                |                   |             |
+----------------+                   +-------------+
```

## 2. 核心功能实现

### 2.1 扩展清单 (manifest.json)

```json
{
    "display_name": "RAG-GO",
    "loading_order": 0,
    "requires": [],
    "optional": [],
    "js": "dist/index.js",
    "css": "",
    "author": "YourName",
    "version": "1.0.0",
    "homePage": "https://github.com/yourusername/Extension-RAG-GO",
    "auto_update": true
}
```

### 2.2 API封装 (src/api.js)

```javascript
/**
 * RAG-GO API封装类
 */
class RAGGoAPI {
    constructor(baseUrl = 'http://localhost:8080') {
        this.baseUrl = baseUrl;
    }

    /**
     * 设置API基础URL
     * @param {string} url 基础URL
     */
    setBaseUrl(url) {
        this.baseUrl = url;
    }

    /**
     * 上传文档到RAG-GO
     * @param {string} name 文档名称
     * @param {string} content 文档内容
     * @param {string} type 文档类型
     * @returns {Promise<Object>} 上传结果
     */
    async uploadDocument(name, content, type = 'text') {
        const response = await fetch(`${this.baseUrl}/api/databank/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, content, type }),
        });

        if (!response.ok) {
            throw new Error(`上传失败: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * 搜索相关文档
     * @param {string} query 查询文本
     * @param {number} limit 结果数量限制
     * @returns {Promise<Array>} 搜索结果
     */
    async search(query, limit = 5) {
        const response = await fetch(`${this.baseUrl}/api/databank/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, limit }),
        });

        if (!response.ok) {
            throw new Error(`搜索失败: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * 获取文档列表
     * @returns {Promise<Array>} 文档列表
     */
    async listDocuments() {
        const response = await fetch(`${this.baseUrl}/api/databank/list`);

        if (!response.ok) {
            throw new Error(`获取列表失败: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * 删除文档
     * @param {string} id 文档ID
     * @returns {Promise<Object>} 删除结果
     */
    async deleteDocument(id) {
        const response = await fetch(`${this.baseUrl}/api/databank/delete/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`删除失败: ${response.statusText}`);
        }

        return await response.json();
    }
}

export default RAGGoAPI;
```

### 2.3 扩展主入口 (src/index.js)

```javascript
import './style.css';
import settings from './settings.html';
import RAGGoAPI from './api.js';

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
export default raggoExtension;
```

### 2.4 设置界面 (src/settings.html)

```html
<div id="raggo_settings">
    <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
            <div class="flex-container alignitemscenter margin0">
                <b>RAG-GO</b>
            </div>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
            <div class="flex-container">
                <div class="flex1">
                    <label>服务器地址</label>
                    <input class="text_pole" type="text" id="raggo_base_url" placeholder="http://localhost:8080">
                </div>
            </div>
            <div class="flex-container">
                <div class="flex1">
                    <label>自动增强上下文</label>
                    <input type="checkbox" id="raggo_auto_enhance">
                </div>
                <div class="flex1">
                    <label>结果数量限制</label>
                    <input class="text_pole" type="number" id="raggo_result_limit" min="1" max="10" step="1">
                </div>
            </div>
            <div class="flex-container justifyCenter alignItemsCenter">
                <button id="raggo_test_connection" class="menu_button menu_button_icon">
                    <i class="fa-solid fa-plug"></i>
                    <span>测试连接</span>
                </button>
            </div>
        </div>
    </div>
</div>
```

### 2.5 样式表 (src/style.css)

```css
/* RAG-GO扩展样式 */
#raggo_documents_dialog {
    padding: 20px;
}

.raggo_upload_section {
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid #444;
}

#raggo_document_list {
    list-style: none;
    padding: 0;
    margin: 0;
}

#raggo_document_list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #333;
}

#raggo_document_list li:hover {
    background-color: rgba(255, 255, 255, 0.05);
}

.doc-info {
    display: flex;
    flex-direction: column;
}

.doc-name {
    font-weight: bold;
    margin-bottom: 5px;
}

.doc-type {
    font-size: 0.8em;
    color: #888;
}

.delete-btn {
    background-color: #e74c3c;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 3px;
    cursor: pointer;
    width: auto;
}

.delete-btn:hover {
    background-color: #c0392b;
}

.loading {
    text-align: center;
    padding: 20px;
    font-style: italic;
    color: #7f8c8d;
}
```

## 3. 项目配置文件

### 3.1 NPM包配置 (package.json)

```json
{
    "name": "extension-rag-go",
    "version": "1.0.0",
    "private": true,
    "main": "dist/index.js",
    "scripts": {
        "build": "webpack --mode production",
        "build:dev": "webpack --mode development",
        "lint": "eslint .",
        "lint:fix": "eslint --fix ."
    },
    "devDependencies": {
        "@eslint/js": "^9.8.0",
        "css-loader": "^7.1.2",
        "eslint": "^8.57.0",
        "html-loader": "^5.1.0",
        "style-loader": "^4.0.0",
        "terser-webpack-plugin": "^5.3.10",
        "webpack": "^5.93.0",
        "webpack-cli": "^5.1.4"
    },
    "dependencies": {
        "lodash": "^4.17.21"
    }
}
```

### 3.2 Webpack配置 (webpack.config.js)

```javascript
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    entry: './src/index.js',
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist'),
        library: {
            type: 'module',
        },
    },
    experiments: {
        outputModule: true,
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.html$/,
                use: ['html-loader'],
            },
        ],
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    format: {
                        comments: false,
                    },
                },
                extractComments: false,
            }),
        ],
    },
};
```

## 4. 集成与部署

### 4.1 扩展安装步骤

1. 将Extension-RAG-GO目录放置在SillyTavern的extensions目录下
2. 运行以下命令构建扩展：
   ```bash
   cd extensions/Extension-RAG-GO
   npm install
   npm run build
   ```
3. 重启SillyTavern，在扩展设置中启用RAG-GO扩展

### 4.2 RAG-GO服务配置

确保RAG-GO服务已启动并监听在配置的端口上（默认为8080）。在扩展设置中配置正确的服务器地址。

## 5. 优势与特点

与直接使用DataBank API相比，通过扩展方式集成RAG-GO有以下优势：

1. **更好的用户体验**：提供专门的UI界面，方便用户管理文档和配置
2. **更灵活的集成方式**：可以自定义上下文增强的方式和时机
3. **无需修改SillyTavern核心代码**：作为扩展独立运行，便于维护和更新
4. **更好的可扩展性**：可以根据需要添加更多功能，如文档预览、批量导入等

## 6. 后续开发计划

1. 添加文件上传功能，支持直接上传PDF、Word等格式文档
2. 实现文档分类和标签管理
3. 添加高级搜索选项，如相似度阈值调整
4. 实现文档内容预览功能
5. 支持批量导入和导出文档