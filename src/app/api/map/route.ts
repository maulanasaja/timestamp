import { NextRequest, NextResponse } from "next/server";

function lon2tile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom)
  );
}

function tile2lon(x: number, z: number): number {
  return (x / Math.pow(2, z)) * 360 - 180;
}

function tile2lat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

async function fetchTileBase64(x: number, y: number, z: number): Promise<string> {
  const url = `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "TimestampGenApp/1.0" } });
    if (!res.ok) return "";
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch (e) {
    return "";
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");

  if (!latParam || !lngParam) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
  }

  const lat = parseFloat(latParam);
  const lng = parseFloat(lngParam);
  const zoom = 15;
  const tileSize = 256;

  try {
    // Determine the exact tile containing the coordinate
    const xTile = lon2tile(lng, zoom);
    const yTile = lat2tile(lat, zoom);

    // Calculate exact pixel offset within that tile
    // x = (lon + 180) / 360 * 2^zoom
    const xExact = ((lng + 180) / 360) * Math.pow(2, zoom);
    const latRad = (lat * Math.PI) / 180;
    const yExact = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom);

    const pixelOffsetX = (xExact - xTile) * tileSize;
    const pixelOffsetY = (yExact - yTile) * tileSize;

    // We want to generate a 300x300 map around the exact coordinate
    const mapSize = 300;
    const centerOffsetX = mapSize / 2;
    const centerOffsetY = mapSize / 2;

    // We need a 3x3 grid of tiles around (xTile, yTile) to ensure full coverage
    // Calculate SVG coordinate for the top-left of the center tile
    const centerTileSvgX = centerOffsetX - pixelOffsetX;
    const centerTileSvgY = centerOffsetY - pixelOffsetY;

    // Fetch the 9 tiles
    const promises = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        promises.push(
          fetchTileBase64(xTile + dx, yTile + dy, zoom).then(base64 => ({
            dx, dy, base64
          }))
        );
      }
    }
    const tilesData = await Promise.all(promises);

    let svgImages = "";
    for (const tile of tilesData) {
      if (!tile.base64) continue;
      const svgX = centerTileSvgX + (tile.dx * tileSize);
      const svgY = centerTileSvgY + (tile.dy * tileSize);
      // Only include images that are at least partially visible
      if (svgX + tileSize > 0 && svgX < mapSize && svgY + tileSize > 0 && svgY < mapSize) {
         svgImages += `<image href="${tile.base64}" x="${svgX}" y="${svgY}" width="${tileSize}" height="${tileSize}" />`;
      }
    }

    // Build the final SVG
    // Add a simple pin marker at the center (150, 150)
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${mapSize}" height="${mapSize}" viewBox="0 0 ${mapSize} ${mapSize}">
        <rect width="${mapSize}" height="${mapSize}" fill="#e5e3df" />
        ${svgImages}
        <g transform="translate(${centerOffsetX}, ${centerOffsetY})">
           <path d="M 0 0 C -10 -15 -15 -25 -15 -35 A 15 15 0 0 1 15 -35 C 15 -25 10 -15 0 0 Z" fill="#ef4444" stroke="white" stroke-width="2" />
           <circle cx="0" cy="-35" r="5" fill="#991b1b" />
        </g>
      </svg>
    `;

    const svgBase64 = Buffer.from(svg).toString("base64");
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

    return NextResponse.json(
      { dataUrl },
      {
        headers: {
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (error: any) {
    console.error("Map proxy error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
