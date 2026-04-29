import { ProductShell } from "../ui/product-shell";
import { WeeklyCalendar } from "../ui/weekly-calendar";

export default function SchedulePage() {
  return (
    <ProductShell activePath="/schedule">
      <WeeklyCalendar />
    </ProductShell>
  );
}
