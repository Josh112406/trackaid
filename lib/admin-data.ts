export const adminMetrics = [
  {
    label: "TrackAid payments",
    value: "₱1,684,200",
    change: "+12.4%",
    tone: "moss",
  },
  {
    label: "Confirmed disbursements",
    value: "₱943,000",
    change: "56.0% of funds",
    tone: "clay",
  },
  {
    label: "External redirects",
    value: "1,248",
    change: "+18.7%",
    tone: "ochre",
  },
  {
    label: "Programs awaiting review",
    value: "7",
    change: "2 need information",
    tone: "terracotta",
  },
];

export const transactionRows = [
  {
    id: "pi_demo_0048",
    campaign: "Typhoon response demonstration",
    type: "Donation",
    amount: "₱5,000",
    status: "Paid",
    time: "Aug 27, 12:42 PM",
  },
  {
    id: "pi_demo_0047",
    campaign: "Typhoon response demonstration",
    type: "Donation",
    amount: "₱2,500",
    status: "Paid",
    time: "Aug 27, 12:31 PM",
  },
  {
    id: "rf_demo_0012",
    campaign: "Flood response demonstration",
    type: "Refund",
    amount: "−₱1,000",
    status: "Completed",
    time: "Aug 27, 11:58 AM",
  },
  {
    id: "ds_demo_0008",
    campaign: "Typhoon response demonstration",
    type: "Disbursement",
    amount: "−₱84,500",
    status: "Confirmed",
    time: "Aug 27, 10:16 AM",
  },
  {
    id: "pi_demo_0046",
    campaign: "Flood response demonstration",
    type: "Donation",
    amount: "₱750",
    status: "Failed",
    time: "Aug 27, 9:44 AM",
  },
];

export const reviewQueue = [
  {
    organization: "Community Relief Network",
    program: "Monsoon family kits",
    proof: "Website + pubmat + authorization",
    status: "Submitted",
    age: "18 min",
  },
  {
    organization: "Bayanihan Youth Alliance",
    program: "Flood cleanup fund",
    proof: "Facebook post + SEC document",
    status: "Needs information",
    age: "3 hr",
  },
  {
    organization: "Island Health Response",
    program: "Emergency medicine delivery",
    proof: "Website + budget + payout proof",
    status: "Submitted",
    age: "5 hr",
  },
  {
    organization: "Northern Luzon Food Bank",
    program: "Rice and water distribution",
    proof: "Video + official website",
    status: "Submitted",
    age: "1 day",
  },
];

export const funnelSteps = [
  { label: "Campaign views", value: 8240, percent: 100 },
  { label: "Donation or redirect opened", value: 2736, percent: 33 },
  { label: "TrackAid payment started", value: 914, percent: 11 },
  { label: "TrackAid payment confirmed", value: 781, percent: 9 },
];

export const trafficByDay = [
  42, 55, 49, 68, 61, 82, 76, 91, 87, 104, 96, 118, 126, 112,
];

export const healthItems = [
  { label: "Official campaign sources", value: "4 healthy", tone: "good" },
  { label: "PayMongo webhook delivery", value: "99.8%", tone: "good" },
  { label: "Pending ledger jobs", value: "3 test jobs", tone: "watch" },
  { label: "Sources approaching 24-hour limit", value: "0", tone: "good" },
];

export const auditLogRows = [
  {
    action: "Program marked needs information",
    actor: "Owner",
    entity: "Flood cleanup fund",
    time: "Aug 27, 12:10 PM",
  },
  {
    action: "Official source check succeeded",
    actor: "System",
    entity: "UNICEF Philippines",
    time: "Aug 27, 11:20 AM",
  },
  {
    action: "Evidence hash anchored",
    actor: "Ledger worker",
    entity: "0x4c6687…af9934",
    time: "Aug 27, 10:22 AM",
  },
  {
    action: "Disbursement confirmed",
    actor: "Owner",
    entity: "ds_demo_0008",
    time: "Aug 27, 10:16 AM",
  },
];
