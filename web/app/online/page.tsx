import { OnlineBooks } from "@/components/online-books";
import { Shell } from "@/components/shell";
import { en } from "@/lib/i18n/messages";

export default function OnlinePage() {
  return (
    <Shell>
      <section className="page-introduction">
        <p className="eyebrow">{en["online.pageEyebrow"]}</p>
        <h1>{en["online.pageTitle"]}</h1>
        <p>{en["online.pageBody"]}</p>
      </section>
      <OnlineBooks />
    </Shell>
  );
}
