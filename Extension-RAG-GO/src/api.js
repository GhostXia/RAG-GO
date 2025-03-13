/**
 * RAG-GO API封装类
 */
class RAGGoAPI {
    constructor(baseUrl = 'http://localhost:8080') {
        this.baseUrl = baseUrl;
    }
    
    /**
     * 发送POST请求到指定API端点
     * @param {string} endpoint API端点
     * @param {Object} data 请求数据
     * @returns {Promise<Object>} 响应结果
     */
    async post(endpoint, data) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`请求失败: ${response.statusText}`);
        }

        return await response.json();
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