import { useAppStore } from '@/stores/app';
import { AdminDashboard } from './dashboard/admin';
import { TeacherDashboard } from './dashboard/teacher';
import { StudentDashboard } from './dashboard/student';

export function Dashboard() {
  const { role } = useAppStore();

  switch (role) {
    case 'admin':
      return <AdminDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'student':
      return <StudentDashboard />;
    default:
      return <AdminDashboard />;
  }
}
