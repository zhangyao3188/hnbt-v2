import axios from 'axios';

/**
 * 代理配置
 */
export const PROXY_CONFIGS = {
    1: {
        name: '闪尘代理',
        url: 'https://sch.shanchendaili.com/api.html?action=get_ip&key=HU027700915310840704oqdi&time=1&count=1&type=json&only=0',
        parseResponse: (data) => {
            if (data.status !== '0') {
                throw new Error(`获取代理IP失败: ${data.info || '未知错误'}`);
            }
            if (!data.list || data.list.length === 0) {
                throw new Error('代理API返回的IP列表为空');
            }
            const proxyInfo = data.list[0];
            return {
                server: proxyInfo.sever,
                port: proxyInfo.port,
                expire: data.expire,
                source: '闪尘代理'
            };
        }
    },
    2: {
        name: 'IP赞代理',
        url: 'https://service.ipzan.com/core-extract?num=1&no=20240729108486120249&minute=1&format=json&protocol=3&pool=quality&mode=whitelist&secret=tgcbijoum2pp78',
        parseResponse: (data) => {
            if (data.code !== 0) {
                throw new Error(`获取代理IP失败: ${data.message || '未知错误'}`);
            }
            if (!data.data || !data.data.list || data.data.list.length === 0) {
                throw new Error('代理API返回的IP列表为空');
            }
            const proxyInfo = data.data.list[0];
            return {
                server: proxyInfo.ip,
                port: proxyInfo.port,
                expire: new Date(proxyInfo.expired).toLocaleString(),
                source: 'IP赞代理',
                net: proxyInfo.net
            };
        }
    }
};

/**
 * 从指定代理源获取代理IP
 * @param {number} proxyType - 代理类型 (1: 闪尘代理, 2: IP赞代理)
 * @returns {Promise<Object>} 代理信息
 */
export async function getProxyFromSource(proxyType = 1) {
    try {
        const config = PROXY_CONFIGS[proxyType];
        if (!config) {
            throw new Error(`不支持的代理类型: ${proxyType}`);
        }

        console.log(`🌐 正在从 ${config.name} 获取代理IP...`);
        
        const response = await axios.get(config.url, {
            timeout: 10000
        });

        const proxyInfo = config.parseResponse(response.data);
        
        console.log(`✅ 成功从 ${config.name} 获取代理IP: ${proxyInfo.server}:${proxyInfo.port}`);
        console.log(`⏰ 代理过期时间: ${proxyInfo.expire}`);
        if (proxyInfo.net) {
            console.log(`🌐 网络类型: ${proxyInfo.net}`);
        }

        return proxyInfo;

    } catch (error) {
        console.error(`❌ 从代理源 ${proxyType} 获取IP失败:`, error.message);
        throw error;
    }
}

/**
 * 获取可用的代理类型列表
 * @returns {Array} 代理类型信息
 */
export function getAvailableProxyTypes() {
    return Object.entries(PROXY_CONFIGS).map(([key, config]) => ({
        type: parseInt(key),
        name: config.name
    }));
} 