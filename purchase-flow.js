import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { logPurchaseStart, logRequest, logResponse, logStepResult, logFinalResult, logError } from './purchase-logger.js';

// 目标服务器域名
const BASE_URL = 'https://ai-smart-subsidy-backend.digitalhainan.com.cn';

/**
 * 创建带代理的axios实例
 * @param {Object} proxyInfo - 代理信息
 * @returns {Object} axios实例
 */
function createProxyAxios(proxyInfo) {
    const proxyUrl = `http://${proxyInfo.server}:${proxyInfo.port}`;
    const agent = new HttpsProxyAgent(proxyUrl);
    
    return axios.create({
        httpsAgent: agent,
        timeout: 10000,
        baseURL: BASE_URL
    });
}

/**
 * 获取通用请求头
 * @param {Object} accountInfo - 账户信息
 * @returns {Object} 请求头
 */
function getCommonHeaders(accountInfo) {
    return {
        'authorization': `Bearer ${accountInfo.grabToken}`,
        'uid': accountInfo.accId,
        'appplatform': 'H5',
        'Content-Type': 'application/json'
    };
}

/**
 * 步骤1：获取系统ticket
 * @param {Object} accountInfo - 账户信息
 * @param {Object} proxyInfo - 代理信息
 * @returns {Promise<Object>} ticket信息
 */
export async function getSystemTicket(accountInfo, proxyInfo) {
    const axiosInstance = createProxyAxios(proxyInfo);
    const headers = getCommonHeaders(accountInfo);
    const stepName = '获取系统ticket';
    const url = `${BASE_URL}/hyd-queue/core/simple/entry`;
    
    console.log('🎫 正在获取系统ticket...');
    
    let attemptCount = 0;
    
    while (true) {
        attemptCount++;
        
        try {
            // 记录请求日志
            logRequest(accountInfo, stepName, 'GET', url, headers, null, proxyInfo);
            
            const response = await axiosInstance.get('/hyd-queue/core/simple/entry', {
                headers
            });
            
            const { success, data, message } = response.data;
            
            // 记录响应日志
            logResponse(accountInfo, stepName, response.status, response.data, success && data?.ticket, 
                       success && data?.ticket ? null : (message || 'ticket为空'));
            
            if (success && data && data.ticket) {
                console.log('✅ 成功获取ticket，开始校验...');
                
                logStepResult(accountInfo, stepName, true, `成功获取ticket: ${data.ticket}`, attemptCount);
                
                return {
                    success: true,
                    ticket: data.ticket,
                    data: data
                };
            }
            
            // 失败情况处理 - 立即重试，不显示详细信息
            
        } catch (error) {
            // 记录错误日志
            logError(accountInfo, stepName, error);
            logResponse(accountInfo, stepName, null, null, false, error.message);
        }
    }
}

/**
 * 步骤2：校验系统ticket
 * @param {string} ticket - 系统ticket
 * @param {Object} accountInfo - 账户信息
 * @param {Object} proxyInfo - 代理信息
 * @returns {Promise<Object>} 校验结果
 */
export async function verifyTicket(ticket, accountInfo, proxyInfo) {
    const axiosInstance = createProxyAxios(proxyInfo);
    const headers = getCommonHeaders(accountInfo);
    const stepName = '校验系统ticket';
    const url = `${BASE_URL}/ai-smart-subsidy-approval/api/queue/ticket/check`;
    const requestData = { ticket };
    
    console.log('🔍 正在校验系统ticket...');
    
    let attemptCount = 0;
    
    while (true) {
        attemptCount++;
        
        try {
            // 记录请求日志
            logRequest(accountInfo, stepName, 'POST', url, headers, requestData, proxyInfo);
            
            const response = await axiosInstance.post('/ai-smart-subsidy-approval/api/queue/ticket/check', 
                requestData, 
                { headers }
            );
            
            const { success, message } = response.data;
            
            // 记录响应日志
            logResponse(accountInfo, stepName, response.status, response.data, success, 
                       success ? null : (message || '校验失败'));
            
            if (success) {
                console.log('✅ ticket校验成功，开始提交预约...');
                logStepResult(accountInfo, stepName, true, 'ticket校验通过', attemptCount);
                
                return {
                    success: true,
                    ticket: ticket
                };
            }
            
            // 校验失败，立即重试，不显示详细信息
            
        } catch (error) {
            // 记录错误日志
            logError(accountInfo, stepName, error);
            logResponse(accountInfo, stepName, null, null, false, error.message);
        }
    }
}

/**
 * 步骤3：提交预约
 * @param {string} ticket - 已校验的ticket
 * @param {Object} accountInfo - 账户信息
 * @param {Object} proxyInfo - 代理信息
 * @returns {Promise<Object>} 提交结果
 */
export async function submitReservation(ticket, accountInfo, proxyInfo) {
    const axiosInstance = createProxyAxios(proxyInfo);
    const headers = getCommonHeaders(accountInfo);
    const stepName = '提交预约申请';
    const url = `${BASE_URL}/ai-smart-subsidy-approval/api/apply/submitApply`;
    
    console.log('📋 正在提交预约申请...');
    
    // 构建请求参数
    const requestData = {
        ticket: ticket,
        uniqueId: accountInfo.uniqueId,
        tourismSubsidyId: accountInfo.tourismSubsidyId
    };
    
    // 如果存在foodSubsidyId，则添加到请求中
    if (accountInfo.foodSubsidyId) {
        requestData.foodSubsidyId = accountInfo.foodSubsidyId;
    }
    
    let attemptCount = 0;
    
    while (true) {
        attemptCount++;
        
        try {
            // 记录请求日志
            logRequest(accountInfo, stepName, 'POST', url, headers, requestData, proxyInfo);
            
            const response = await axiosInstance.post('/ai-smart-subsidy-approval/api/apply/submitApply', 
                requestData, 
                { headers }
            );
            
            const { success, message, code } = response.data;
            
            // 记录响应日志
            logResponse(accountInfo, stepName, response.status, response.data, success, 
                       success ? null : `${message || '未知原因'} (${code || '无代码'})`);
            
            if (success) {
                console.log('🎉 预约提交成功！');
                logStepResult(accountInfo, stepName, true, '预约提交成功！', attemptCount);
                
                return {
                    success: true,
                    message: '预约成功！',
                    data: response.data
                };
            }
            
            // 提交失败，立即重试，不显示详细信息
            
        } catch (error) {
            // 记录错误日志
            logError(accountInfo, stepName, error);
            logResponse(accountInfo, stepName, null, null, false, error.message);
        }
    }
}

/**
 * 完整的抢购流程
 * @param {Object} accountInfo - 账户信息
 * @param {Object} proxyInfo - 代理信息
 * @returns {Promise<Object>} 抢购结果
 */
export async function executePurchaseFlow(accountInfo, proxyInfo) {
    try {
        console.log('🚀 开始执行完整抢购流程...');
        console.log('👤 账户:', accountInfo.name);
        console.log('🌐 代理:', `${proxyInfo.server}:${proxyInfo.port} (${proxyInfo.source})`);
        console.log('📍 真实IP:', proxyInfo.validatedIP);
        console.log('=====================================');
        
        // 记录抢购开始日志
        logPurchaseStart(accountInfo, proxyInfo);
        
        // 步骤1：获取系统ticket
        const ticketResult = await getSystemTicket(accountInfo, proxyInfo);
        if (!ticketResult.success) {
            const errorMsg = '获取系统ticket失败';
            logFinalResult(accountInfo, false, errorMsg);
            throw new Error(errorMsg);
        }
        
        // 步骤2：校验ticket
        const verifyResult = await verifyTicket(ticketResult.ticket, accountInfo, proxyInfo);
        if (!verifyResult.success) {
            const errorMsg = '校验ticket失败';
            logFinalResult(accountInfo, false, errorMsg);
            throw new Error(errorMsg);
        }
        
        // 步骤3：提交预约
        const submitResult = await submitReservation(verifyResult.ticket, accountInfo, proxyInfo);
        
        console.log('🎊 抢购流程执行完成！');
        
        // 记录最终成功结果
        logFinalResult(accountInfo, submitResult.success, submitResult.message, submitResult.data);
        
        return submitResult;
        
    } catch (error) {
        console.error('💥 抢购流程执行失败:', error.message);
        
        // 记录最终失败结果
        logFinalResult(accountInfo, false, error.message);
        logError(accountInfo, '完整抢购流程', error);
        
        return {
            success: false,
            error: error.message
        };
    }
} 