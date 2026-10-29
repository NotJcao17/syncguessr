import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "syncguessr: adivina la canción desde 0.1 segundos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Static Archivo instances from Google Fonts (the renderer can't use variable axes). */
async function archivo(stretch: number, weight: number) {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@${stretch},${weight}`).then((r) => r.text());
  const url = css.match(/src: url\((.+?)\)/)?.[1];
  return url ? fetch(url).then((r) => r.arrayBuffer()) : null;
}

export default async function OpengraphImage() {
  const [black, bold] = await Promise.all([archivo(125, 900), archivo(112, 800)]);
  const fonts = [
    black && { name: "Black", data: black, weight: 900 as const },
    bold && { name: "Bold", data: bold, weight: 800 as const },
  ].filter((f): f is NonNullable<typeof f> => Boolean(f));
  const svg = await readFile(join(process.cwd(), "src/app/icon.svg"), "utf8");
  const icon = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 84px",
          background: "#181C27",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={icon} width={84} height={84} alt="" />
          <div style={{ display: "flex", fontSize: 52, fontFamily: "Bold", letterSpacing: -2 }}>
            sync<span style={{ color: "#A5B4FC" }}>guessr</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 40 }}>
          <div style={{ display: "flex", alignItems: "baseline", fontSize: 250, fontFamily: "Black", letterSpacing: -14, lineHeight: 0.8 }}>
            0.1<span style={{ fontSize: 110, color: "#A5B4FC", letterSpacing: -4 }}>s</span>
          </div>
          <div style={{ display: "flex", fontSize: 40, fontFamily: "Bold", lineHeight: 1.15, color: "#C3CAD9", maxWidth: 470, paddingBottom: 6 }}>
            ¿Te basta una décima de segundo para reconocer una canción?
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
