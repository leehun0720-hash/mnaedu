import { getPublicQuestions } from "@/lib/questions";
import Home from "./home-client";

// Questions come from the database, so the page cannot be baked at build time
export const dynamic = "force-dynamic";

export default async function Page() {
  const weeklyExams = await getPublicQuestions();
  return <Home weeklyExams={weeklyExams} />;
}
