import { ImageResponse } from "next/og";
export const alt = "Worthlane — A life together. A little more money clarity.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"64px 76px", color:"#193b32", background:"#faf8f2" }}><div style={{ display:"flex", alignItems:"center", gap:16, fontSize:30, fontWeight:600 }}><svg width="42" height="42" viewBox="0 0 48 48"><path d="M6 13l9 23 9-17 9 17 9-23M18 9h12" fill="none" stroke="#193b32" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>worthlane</div><div style={{ display:"flex", flexDirection:"column" }}><span style={{ fontSize:75, letterSpacing:-3, lineHeight:1.06, fontFamily:"serif" }}>A life together.</span><span style={{ fontSize:75, letterSpacing:-3, lineHeight:1.06, fontFamily:"serif" }}>A little more money clarity.</span></div><div style={{ display:"flex", justifyContent:"space-between", borderTop:"1px solid #cbd6bf", paddingTop:25, fontSize:21 }}><span>Shared plans. Separate logins. Your choice.</span><span>Beta in development</span></div></div>, size);
}
