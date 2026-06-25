import { AppShell } from '@/app/component/AppShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
