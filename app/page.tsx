// The daily moment: this month's stained-glass window, one pane per night, and
// tonight's wind-down. The state and the overlays live in components/Moment.

import Moment from "@/components/Moment";
import { getDailyGoal } from "@/lib/data";

export default function Page() {
  return <Moment initial={getDailyGoal()} />;
}
