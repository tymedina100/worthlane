type CoverageNotice = { accountId: string; message: string };

export function BankCoverageNotices({ notices }: { notices: CoverageNotice[] }) {
  if (notices.length === 0) return null;
  if (notices.length === 1) return <p className="status-banner" role="status">{notices[0].message}</p>;
  return (
    <details className="status-banner bank-coverage-notices">
      <summary>Bank history may be incomplete · {notices.length} accounts</summary>
      <p>Totals use available bank history and may be incomplete. Review each account’s coverage below.</p>
      <ul>{notices.map(notice => <li key={notice.accountId}>{notice.message}</li>)}</ul>
    </details>
  );
}
