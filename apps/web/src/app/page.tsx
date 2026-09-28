import { redirect } from 'next/navigation';

/** Candidates arrive via their personal link (/a/<token>); everyone else goes to the recruiter panel. */
export default function HomePage() {
  redirect('/admin');
}
