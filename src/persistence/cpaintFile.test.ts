import { describe, expect, it } from "vitest";
import {
  embeddedThumbnailLength,
  packDocument,
  THUMBNAIL_HEADER_SIZE,
  unpackDocument,
} from "./cpaintFile";
import { StoredDocument } from "./document";

function bytes(...values: number[]) {
  return new Uint8Array(values);
}

async function blobBytes(blob: Blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

const sampleDoc: StoredDocument = {
  layers: [
    {
      type: "layer",
      id: "bg",
      canvas: new Blob([bytes(1, 2, 3, 4)], { type: "image/png" }),
      visible: true,
      opacity: 1,
      blendMode: "source-over",
      locked: false,
    },
    {
      type: "group",
      id: "layer-2",
      visible: true,
      opacity: 0.5,
      blendMode: "multiply",
      locked: false,
      layers: [
        {
          type: "layer",
          id: "layer-3",
          canvas: new Blob([bytes(9, 8, 7)], { type: "image/png" }),
          visible: false,
          opacity: 0.25,
          blendMode: "screen",
          locked: true,
        },
      ],
    },
  ],
  selection: {
    width: 2,
    height: 2,
    data: new Blob([bytes(255, 0, 0, 255)], { type: "application/octet-stream" }),
  },
  size: { width: 32, height: 16 },
  colorHistory: ["#fff", "#000"],
};

describe("cpaint container", () => {
  it("round-trips a document through pack/unpack", async () => {
    const restored = await unpackDocument(await packDocument(sampleDoc));

    expect(restored.size).toEqual(sampleDoc.size);
    expect(restored.colorHistory).toEqual(sampleDoc.colorHistory);

    const bg = restored.layers[0];
    if (bg.type !== "layer") throw new Error("expected layer");
    expect(bg.id).toBe("bg");
    expect(bg.canvas.type).toBe("image/png");
    expect(await blobBytes(bg.canvas)).toEqual(bytes(1, 2, 3, 4));

    const group = restored.layers[1];
    if (group.type !== "group") throw new Error("expected group");
    const child = group.layers[0];
    if (child.type !== "layer") throw new Error("expected nested layer");
    expect(child.opacity).toBe(0.25);
    expect(await blobBytes(child.canvas)).toEqual(bytes(9, 8, 7));

    expect(restored.selection).not.toBeNull();
    expect(await blobBytes(restored.selection!.data)).toEqual(
      bytes(255, 0, 0, 255)
    );
  });

  it("rejects non-cpaint data", async () => {
    await expect(
      unpackDocument(new Blob([bytes(0, 1, 2, 3, 4, 5, 6, 7)]))
    ).rejects.toThrow();
  });

  it("embeds a thumbnail and still round-trips the document", async () => {
    const thumbnail = new Blob([bytes(10, 20, 30, 40, 50)]);
    const packed = await packDocument(sampleDoc, thumbnail);

    const headerBytes = await packed.slice(0, THUMBNAIL_HEADER_SIZE).arrayBuffer();
    expect(embeddedThumbnailLength(headerBytes)).toBe(5);

    const embedded = packed.slice(
      THUMBNAIL_HEADER_SIZE,
      THUMBNAIL_HEADER_SIZE + 5
    );
    expect(await blobBytes(embedded)).toEqual(bytes(10, 20, 30, 40, 50));

    const restored = await unpackDocument(packed);
    expect(restored.size).toEqual(sampleDoc.size);
    const bg = restored.layers[0];
    if (bg.type !== "layer") throw new Error("expected layer");
    expect(await blobBytes(bg.canvas)).toEqual(bytes(1, 2, 3, 4));
  });

  it("reports zero thumbnail length when none is embedded", async () => {
    const packed = await packDocument(sampleDoc);
    const headerBytes = await packed.slice(0, THUMBNAIL_HEADER_SIZE).arrayBuffer();
    expect(embeddedThumbnailLength(headerBytes)).toBe(0);
  });
});
