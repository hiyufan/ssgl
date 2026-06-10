import { useRole } from '@/hooks/use-role';
import { AdminDashboard } from './dashboard/admin';
import { TeacherDashboard } from './dashboard/teacher';
import { StudentDashboard } from './dashboard/student';

export function Dashboard() {
  const role = useRole();

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
