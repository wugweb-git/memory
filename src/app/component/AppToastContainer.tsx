'use client';

import { ToastContainer, type ToastContainerProps } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * Shared toast host. Toasts render with role="status" (polite live region) so a burst of
 * success messages does not interrupt screen-reader speech the way the library default
 * role="alert" does. Errors stay visible longer and the timer pauses on hover and when the
 * window loses focus, so people using assistive tech have time to read them (WCAG 2.2.1).
 */
export function AppToastContainer(props: ToastContainerProps) {
  return (
    <ToastContainer
      theme="light"
      role="status"
      autoClose={6000}
      pauseOnHover
      pauseOnFocusLoss
      draggable={false}
      newestOnTop
      limit={3}
      {...props}
    />
  );
}
