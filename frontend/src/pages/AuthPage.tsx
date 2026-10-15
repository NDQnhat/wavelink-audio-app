import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/components/ui/Toast';

function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, loginWithGoogle, guestLogin, isLoading } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const clientId = '1843465297-bbnnggqpe1s5r82gtvi2h0kli7fves7c.apps.googleusercontent.com';

    // Bắt token nếu Google redirect về URL hash
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const idToken = hashParams.get('id_token');
      const accessToken = hashParams.get('access_token');
      if (idToken || accessToken) {
        handleGoogleSuccess({ credential: idToken || undefined, accessToken: accessToken || undefined });
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  const handleGoogleSuccess = async (payload: { credential?: string; accessToken?: string }) => {
    let name = '';
    let email = '';
    let picture = '';
    let sub = '';

    if (payload.credential) {
      const claims = decodeJwt(payload.credential);
      if (claims) {
        name = claims.name || '';
        email = claims.email || '';
        picture = claims.picture || '';
        sub = claims.sub || '';
      }
    }

    // Nếu có accessToken mà chưa đủ tên/ảnh, gọi UserInfo API
    if ((!name || !picture) && payload.accessToken) {
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${payload.accessToken}` },
        });
        if (res.ok) {
          const info = await res.json();
          name = info.name || name;
          email = info.email || email;
          picture = info.picture || picture;
          sub = info.sub || sub;
        }
      } catch {}
    }

    try {
      await loginWithGoogle({
        credential: payload.credential,
        accessToken: payload.accessToken,
        name,
        email,
        picture,
        googleId: sub,
      });
      toast.success(`Chào mừng ${name || 'bạn'} đến với WaveLink!`);
      navigate('/home');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Đăng nhập Google thất bại');
    }
  };

  const handleGoogleCustomClick = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google;
    const clientId = '1843465297-bbnnggqpe1s5r82gtvi2h0kli7fves7c.apps.googleusercontent.com';

    if (google?.accounts?.oauth2) {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: (resp: { access_token?: string; error?: string }) => {
          if (resp.access_token) {
            handleGoogleSuccess({ accessToken: resp.access_token });
          } else if (resp.error) {
            toast.error('Đăng nhập Google bị hủy: ' + resp.error);
          }
        },
      });
      tokenClient.requestAccessToken({ prompt: 'select_account' });
      return;
    }

    // Fallback popup authorization
    const redirectUri = window.location.origin;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token%20id_token&scope=openid%20profile%20email&nonce=${Date.now()}&prompt=select_account`;

    const popup = window.open(authUrl, 'google_login_popup', 'width=520,height=650,left=200,top=100');
    if (!popup) {
      window.location.href = authUrl;
      return;
    }

    const checkPopup = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          return;
        }
        if (popup.location.href.includes(redirectUri) && popup.location.hash) {
          const hashParams = new URLSearchParams(popup.location.hash.substring(1));
          const idToken = hashParams.get('id_token');
          const accessToken = hashParams.get('access_token');
          clearInterval(checkPopup);
          popup.close();
          if (idToken || accessToken) {
            handleGoogleSuccess({ credential: idToken || undefined, accessToken: accessToken || undefined });
          }
        }
      } catch {
        // Cross-origin before redirect - ignore
      }
    }, 500);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error('Vui lòng nhập tài khoản và mật khẩu');
      return;
    }
    try {
      await login({ username: username.trim(), password });
      toast.success('Đăng nhập thành công!');
      navigate('/home');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Đăng nhập thất bại');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error('Vui lòng nhập tài khoản và mật khẩu');
      return;
    }
    try {
      await register({ username: username.trim(), password });
      toast.success('Đăng ký thành công!');
      navigate('/home');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Đăng ký thất bại');
    }
  };

  const handleGuestLogin = async () => {
    try {
      await guestLogin();
      toast.info('Đã vào chế độ Khách Nghe Thử!');
      navigate('/home');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Lỗi khi vào bằng tài khoản Khách');
    }
  };

  const handleFillDemo = (u: string, p: string) => {
    setActiveTab('login');
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 gap-5 w-full max-w-sm mx-auto pb-16 fade-in-comic">
      {/* 1. Comic Logo & Callout */}
      <div className="text-center flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-2xl border-3 border-black bg-[#FFE600] text-black flex items-center justify-center shadow-comic-md">
          <i className="ri-headphone-fill text-3xl" />
        </div>
        <h1 className="font-extrabold text-2xl uppercase tracking-tight text-black mt-1">WaveLink</h1>
        <div className="manga-bubble text-xs font-bold text-black max-w-xs mt-1">
          Nền tảng phát audio và nội dung truyện tranh trực tuyến WaveLink!
        </div>
      </div>

      {/* 2. Auth Card */}
      <div className="card-comic p-5 w-full bg-white flex flex-col gap-4">
        {/* Tabs */}
        <div className="grid grid-cols-2 gap-2 border-b-2 border-black pb-3">
          <button
            onClick={() => setActiveTab('login')}
            className={`btn-comic text-xs py-2 font-black ${
              activeTab === 'login' ? 'btn-comic-yellow' : 'bg-gray-100 font-bold'
            }`}
          >
            Đăng Nhập
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`btn-comic text-xs py-2 ${
              activeTab === 'register' ? 'btn-comic-yellow font-black' : 'bg-gray-100 font-bold'
            }`}
          >
            Đăng Ký Mới
          </button>
        </div>

        {/* Login Form */}
        {activeTab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-extrabold text-xs uppercase text-black" htmlFor="login-username">
                Tên đăng nhập / Email
              </label>
              <div className="relative flex items-center w-full">
                <i className="ri-user-3-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-bold pointer-events-none z-10" />
                <input
                  type="text"
                  id="login-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-comic pl-9 pr-3 text-xs w-full"
                  placeholder="Nhập tài khoản"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-extrabold text-xs uppercase text-black" htmlFor="login-password">
                Mật khẩu
              </label>
              <div className="relative flex items-center w-full">
                <i className="ri-lock-2-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-bold pointer-events-none z-10" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-comic pl-9 pr-9 text-xs w-full"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black z-10 p-1 flex items-center justify-center"
                  tabIndex={-1}
                >
                  <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} />
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-comic btn-comic-primary text-xs py-3 mt-2 font-black shadow-comic"
            >
              {isLoading ? (
                <i className="ri-loader-4-line animate-spin text-base" />
              ) : (
                <i className="ri-login-box-line text-base" />
              )}{' '}
              Đăng Nhập Ngay
            </button>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-extrabold text-xs uppercase text-black" htmlFor="register-username">
                Tên tài khoản mới
              </label>
              <div className="relative flex items-center w-full">
                <i className="ri-user-add-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-bold pointer-events-none z-10" />
                <input
                  type="text"
                  id="register-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-comic pl-9 pr-3 text-xs w-full"
                  placeholder="Chọn tên độc giả"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-extrabold text-xs uppercase text-black" htmlFor="register-password">
                Mật khẩu
              </label>
              <div className="relative flex items-center w-full">
                <i className="ri-lock-password-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-bold pointer-events-none z-10" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="register-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-comic pl-9 pr-9 text-xs w-full"
                  placeholder="Tạo mật khẩu"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black z-10 p-1 flex items-center justify-center"
                  tabIndex={-1}
                >
                  <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} />
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-comic btn-comic-teal text-xs py-3 mt-2 font-black shadow-comic"
            >
              {isLoading ? (
                <i className="ri-loader-4-line animate-spin text-base" />
              ) : (
                <i className="ri-user-shared-line text-base" />
              )}{' '}
              Hoàn Tất Đăng Ký
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="relative flex items-center justify-center my-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-dashed border-gray-300" />
          </div>
          <span className="relative bg-white px-3 text-xs font-black uppercase text-gray-500">HOẶC TIẾP TỤC VỚI</span>
        </div>

        {/* Google Sign-In Actions */}
        <div className="flex flex-col gap-2">
          {/* Custom Google Button */}
          <button
            onClick={handleGoogleCustomClick}
            type="button"
            disabled={isLoading}
            className="btn-comic bg-white hover:bg-gray-50 text-black text-xs py-2.5 font-extrabold shadow-comic flex items-center justify-center gap-2 border-2 border-black"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Đăng Nhập Bằng Google</span>
          </button>
        </div>

        {/* 1-Click Guest Access */}
        {/* <button
          onClick={handleGuestLogin}
          type="button"
          disabled={isLoading}
          className="btn-comic btn-comic-yellow text-xs py-2.5 font-black shadow-comic mt-1"
        >
          <i className="ri-flashlight-fill text-base" /> Khách Nghe Thử (1-Click)
        </button> */}
      </div>

      {/* Footer Demo Accounts Info */}
      <div className="text-center text-[11px] font-bold text-gray-600 flex flex-col gap-1.5 items-center">
        <span>Tài khoản mẫu (Bấm để điền nhanh):</span>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => handleFillDemo('admin123', 'admin123')}
            className="badge-comic badge-comic-white hover:badge-comic-yellow text-[10px] cursor-pointer"
          >
            👑 admin123 (Admin)
          </button>
          <button
            type="button"
            onClick={() => handleFillDemo('vip123', 'vip123')}
            className="badge-comic badge-comic-white hover:badge-comic-yellow text-[10px] cursor-pointer"
          >
            💎 vip123 (VIP)
          </button>
          <button
            type="button"
            onClick={() => handleFillDemo('user123', 'user123')}
            className="badge-comic badge-comic-white hover:badge-comic-yellow text-[10px] cursor-pointer"
          >
            👤 user123 (Free)
          </button>
        </div>
      </div>
    </div>
  );
};

