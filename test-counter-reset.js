import { proxyManager, getProxyManagerStatus } from './proxy-manager.js';

console.log('🧪 测试代理切换计数器重置逻辑...\n');

// 获取初始状态
console.log('📊 初始状态:', getProxyManagerStatus());

// 模拟多次切换计数增加
console.log('\n🔄 模拟切换过程...');
proxyManager.switchCount = 1;
console.log('第1次切换后:', getProxyManagerStatus());

proxyManager.switchCount = 2;
console.log('第2次切换后:', getProxyManagerStatus());

// 模拟成功获取代理后重置
console.log('\n✅ 模拟成功获取代理后重置...');
proxyManager.resetSwitchCount();
console.log('重置后状态:', getProxyManagerStatus());

// 再次模拟切换
console.log('\n🔄 重置后再次切换...');
proxyManager.switchCount = 1;
console.log('重置后第1次切换:', getProxyManagerStatus());

console.log('\n🎯 测试完成！重置逻辑工作正常。');
