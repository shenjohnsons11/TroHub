const mongoose = require('mongoose');

const connectDB = async () => {
    const tryConnect = async (uri, label = 'MongoDB') => {
        if (!uri) return false;
        let cleanUri = uri.trim().replace(/^["']|["']$/g, '');
        if (cleanUri.includes('<') || cleanUri.includes('>')) {
            console.error(`🚨 [${label}] CẢNH BÁO: Chuỗi kết nối đang chứa ký tự ngoặc nhọn '<' hoặc '>'. Hãy xóa bỏ dấu ngoặc nhọn và chỉ giữ lại thông tin thật (Ví dụ: thay <admin> thành admin, thay <pass123> thành pass123)!`);
        }
        try {
            let connectUrl = cleanUri;
            if (cleanUri.startsWith('mongodb://') || cleanUri.startsWith('mongodb+srv://')) {
                try {
                    const mongoUrl = new URL(cleanUri);
                    if (process.env.MONGODB_DATABASE && (!mongoUrl.pathname || mongoUrl.pathname === '/')) {
                        mongoUrl.pathname = `/${process.env.MONGODB_DATABASE}`;
                    }
                    connectUrl = mongoUrl.toString();
                } catch (e) {
                    connectUrl = cleanUri;
                }
            }
            await mongoose.connect(connectUrl, {
                serverSelectionTimeoutMS: 5000, // Chờ tối đa 5s để báo lỗi ngay thay vì treo lâu
            });
            return true;
        } catch (e) {
            console.error(`⚠️ [${label}] Kết nối thất bại: ${e.message}`);
            if (e.message.includes('bad auth') || e.message.includes('Authentication failed')) {
                console.error('👉 GỢI Ý: Sai Username hoặc Password trên MongoDB Atlas. Nếu mật khẩu có ký tự đặc biệt (@, #, :, /, ?...), hãy mã hóa URL (ví dụ @ thành %40).');
            } else if (e.message.includes('timed out') || e.message.includes('Server selection')) {
                console.error('👉 GỢI Ý: Chưa cấp quyền IP trên MongoDB Atlas. Vào Network Access > Add IP Address > chọn "Allow Access From Anywhere" (0.0.0.0/0).');
            } else if (e.message.includes('ECONNREFUSED')) {
                console.error('👉 GỢI Ý: MongoDB Local chưa được khởi động trên máy (chạy: brew services start mongodb-community).');
            }
            return false;
        }
    };

    // 1. Thử kết nối MongoDB Local nếu có cấu hình
    const localUri = process.env.MONGODB_LOCAL_URI;
    if (localUri) {
        const localOk = await tryConnect(localUri, 'Local MongoDB');
        if (localOk) {
            console.log('✅ Kết nối Local MongoDB thành công!');
            return;
        }
    }

    // 2. Thử kết nối MongoDB Cloud / Atlas (hỗ trợ cả MONGODB_URI lẫn MONGO_URI)
    const cloudUri = (process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || '').trim();
    if (cloudUri) {
        const cloudOk = await tryConnect(cloudUri, 'MongoDB Atlas Cloud');
        if (cloudOk) {
            console.log('✅ Kết nối MongoDB Atlas Cloud thành công!');
            return;
        }
    }

    // 3. Nếu đang ở môi trường dev và chưa cấu hình gì, thử fallback về local default
    if (process.env.NODE_ENV !== 'production' && !localUri && !cloudUri) {
        console.log('ℹ️ Chưa có biến MONGODB_URI hoặc MONGODB_LOCAL_URI, đang thử kết nối mongodb://127.0.0.1:27017/trohub...');
        const defaultOk = await tryConnect('mongodb://127.0.0.1:27017/trohub', 'Default Local');
        if (defaultOk) {
            console.log('✅ Kết nối Default Local MongoDB thành công!');
            return;
        }
    }

    console.error('\n❌ Lỗi kết nối MongoDB: Không thể kết nối tới Local MongoDB hoặc MongoDB Atlas.');
    console.error('📋 CÁCH KHẮC PHỤC NHANH:');
    console.error('1. Tạo file `backend/.env` (nếu chưa có).');
    console.error('2. Điền chuỗi kết nối: MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/trohub?retryWrites=true&w=majority');
    console.error('3. Trên MongoDB Atlas: Vào Network Access -> Bật "Allow Access from Anywhere" (0.0.0.0/0).\n');
    process.exit(1);
};

module.exports = connectDB;
