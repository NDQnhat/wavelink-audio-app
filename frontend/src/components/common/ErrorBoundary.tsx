import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="card-comic p-8 m-4 text-center bg-white flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full border-2 border-black bg-[#E63946] text-white flex items-center justify-center shadow-comic">
            <i className="ri-error-warning-line text-3xl font-black" />
          </div>
          <h3 className="font-extrabold text-base uppercase text-black">Đã xảy ra lỗi giao diện</h3>
          <p className="text-xs font-semibold text-gray-600 max-w-xs">
            Hệ thống gặp sự cố không mong muốn. Bạn có thể tải lại trang hoặc quay về trang chủ.
          </p>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Thử Lại
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                window.location.hash = '#/home';
                window.location.reload();
              }}
            >
              Về Trang Chủ
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
