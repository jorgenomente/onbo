'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { removeMemberAssignment } from '@/server/actions/assignments/removeMemberAssignment';

type CourseProgressState = 'not_started' | 'in_progress' | 'completed';

type MemberCourseStatus = {
  moduleId: string;
  moduleTitle: string;
  moduleStatus: string;
  dueDate: string | null;
  progress: {
    doneCount: number;
    totalCount: number;
    percent: number;
    state: CourseProgressState;
  };
  finalQuiz: {
    quizId: string;
    latestAttempt: {
      score: number;
      passed: boolean;
      created_at: string;
    } | null;
  } | null;
};

type MemberCoursesDialogProps = {
  memberName: string;
  memberUserId: string;
  courses: MemberCourseStatus[];
};

const stateLabels: Record<CourseProgressState, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
};

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-AR', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

export default function MemberCoursesDialog({
  memberName,
  memberUserId,
  courses,
}: MemberCoursesDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Ver cursos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Cursos de {memberName}</DialogTitle>
        </DialogHeader>

        {courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este miembro no tiene cursos asignados.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Progreso</TableHead>
                <TableHead>Quiz final</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => {
                const quizAttempt = course.finalQuiz?.latestAttempt ?? null;
                const quizLabel = course.finalQuiz
                  ? quizAttempt
                    ? `${quizAttempt.score}% · ${quizAttempt.passed ? 'Aprobado' : 'Reprobado'} · ${formatDate(quizAttempt.created_at)}`
                    : 'Pendiente'
                  : 'Sin quiz';

                return (
                  <TableRow key={course.moduleId}>
                    <TableCell>
                      <div className="font-medium">{course.moduleTitle}</div>
                      <div className="text-xs text-muted-foreground">
                        {course.moduleStatus}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{stateLabels[course.progress.state]}</Badge>
                    </TableCell>
                    <TableCell>
                      {course.progress.percent}% ({course.progress.doneCount}/
                      {course.progress.totalCount})
                    </TableCell>
                    <TableCell>{quizLabel}</TableCell>
                    <TableCell>{formatDate(course.dueDate)}</TableCell>
                    <TableCell>
                      <form
                        action={async (formData) => {
                          await removeMemberAssignment(formData);
                        }}
                      >
                        <input type="hidden" name="member_user_id" value={memberUserId} />
                        <input type="hidden" name="module_id" value={course.moduleId} />
                        <Button type="submit" variant="destructive" size="sm">
                          Remover
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
