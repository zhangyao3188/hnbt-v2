import fs from 'fs';
import { purchaseFunction } from './purchase.js';
import { getProxyFromSource, getAvailableProxyTypes } from './proxy-config.js';
import { testProxyIP } from './proxy-test.js';

/**
 * 解析命令行参数
 * @returns {Object} 解析后的参数
 */
function parseCommandLineArgs() {
    const args = process.argv.slice(2);
    const params = {
        proxyType: 1 // 默认使用第一个代理
    };

    // 解析 --proxy 参数
    const proxyIndex = args.findIndex(arg => arg === '--proxy' || arg === '-p');
    if (proxyIndex !== -1 && args[proxyIndex + 1]) {
        const proxyType = parseInt(args[proxyIndex + 1]);
        if (!isNaN(proxyType) && (proxyType === 1 || proxyType === 2)) {
            params.proxyType = proxyType;
        } else {
            console.warn('⚠️  无效的代理类型，将使用默认代理 (1)');
        }
    }

    return params;
}

/**
 * 显示使用帮助
 */
function showUsage() {
    console.log('\n📖 使用方法:');
    console.log('  npm start                    # 使用默认代理 (闪尘代理)');
    console.log('  npm start -- --proxy 1      # 使用闪尘代理');
    console.log('  npm start -- --proxy 2      # 使用IP赞代理');
    console.log('  npm start -- -p 1           # 简写形式');
    console.log('\n🔗 可用代理源:');
    
    const availableProxies = getAvailableProxyTypes();
    availableProxies.forEach(proxy => {
        console.log(`  ${proxy.type}: ${proxy.name}`);
    });
    console.log('');
}

/**
 * 读取账户信息
 * @returns {Promise<Object>} 账户信息
 */
async function loadAccountInfo() {
    try {
        console.log('📖 正在读取账户信息...');
        
        const accountData = fs.readFileSync('accounts.json', 'utf8');
        const accountInfo = JSON.parse(accountData);
        
        console.log('✅ 成功读取账户信息:', {
            name: accountInfo.name,
            phone: accountInfo.phone,
            uniqueId: accountInfo.uniqueId
        });

        return accountInfo;

    } catch (error) {
        console.error('❌ 读取账户信息失败:', error.message);
        throw error;
    }
}

/**
 * 获取并验证可用的代理IP
 * @param {number} proxyType - 代理类型
 * @param {number} maxAttempts - 最大尝试次数
 * @returns {Promise<Object>} 验证通过的代理信息
 */
async function getValidatedProxyIP(proxyType, maxAttempts = 5) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`\n🔄 第 ${attempt}/${maxAttempts} 次获取代理IP`);
            
            // 获取代理IP
            const proxyInfo = await getProxyFromSource(proxyType);
            
            // 测试代理IP是否可用
            const testResult = await testProxyIP(proxyInfo);
            
            if (testResult.success) {
                console.log(`✅ 代理IP验证成功！将使用 ${proxyInfo.source} 的IP: ${testResult.ip}`);
                return {
                    ...proxyInfo,
                    validatedIP: testResult.ip
                };
            }
            
            console.log(`❌ 代理IP验证失败: ${testResult.error}`);
            
            if (attempt < maxAttempts) {
                console.log('⏳ 等待 3 秒后重新获取代理IP...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
        } catch (error) {
            console.error(`💥 第 ${attempt} 次获取代理IP失败:`, error.message);
            
            if (attempt < maxAttempts) {
                console.log('⏳ 等待 3 秒后重试...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
    }
    
    throw new Error(`经过 ${maxAttempts} 次尝试，无法获取到可用的代理IP`);
}

/**
 * 主函数
 */
async function main() {
    try {
        // 解析命令行参数
        const cmdArgs = parseCommandLineArgs();
        
        // 检查是否需要显示帮助
        if (process.argv.includes('--help') || process.argv.includes('-h')) {
            showUsage();
            return;
        }

        console.log('🚀 启动抢购程序...');
        console.log(`📡 使用代理类型: ${cmdArgs.proxyType}`);
        console.log('=====================================');

        // 1. 读取账户信息
        const accountInfo = await loadAccountInfo();

        // 2. 获取并验证可用的代理IP
        console.log('\n🌐 开始获取并验证代理IP...');
        const validatedProxyInfo = await getValidatedProxyIP(cmdArgs.proxyType);

        console.log('=====================================');
        console.log('✅ 代理IP验证完成，开始执行抢购流程...');

        // 3. 调用抢购函数（传入已验证的代理信息）
        const result = await purchaseFunction(accountInfo, validatedProxyInfo);

        console.log('=====================================');
        
        if (result.success) {
            console.log('🎉 抢购程序执行完成:', result.message);
        } else {
            console.error('💥 抢购程序执行失败:', result.error);
            process.exit(1);
        }

    } catch (error) {
        console.error('💥 程序执行过程中发生致命错误:', error.message);
        
        // 如果是代理相关错误，显示使用帮助
        if (error.message.includes('代理') || error.message.includes('白名单')) {
            showUsage();
        }
        
        process.exit(1);
    }
}

// 启动程序
main(); 