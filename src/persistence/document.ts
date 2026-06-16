/**
 * Document codec: pure conversion between the in-memory paint `State` and a
 * backend-agnostic serialized `StoredDocument`.
 *
 * This layer knows about the paint core (State / MCanvas / Selection) but
 * nothing about where documents are stored. Storage backends (IndexedDB,
 * cloud, ...) consume `StoredDocument` without depending on the core.
 */

import { MCanvas } from "@/libs/MCanvas";
import { Selection } from "@/libs/Selection";
import { ALL_BLEND_MODES, BlendMode } from "@/model/blendMode";
import {
  computeNextLayerIdFromLayers,
  Layer,
  LayerGroup,
  State,
} from "@/model/state";
import { z } from "zod";

const storedLayerSchema = z.object({
  type: z.literal("layer"),
  id: z.string(),
  canvas: z.instanceof(Blob),
  visible: z.boolean(),
  opacity: z.number().min(0).max(1),
  blendMode: z.enum(ALL_BLEND_MODES),
  locked: z.boolean(),
});

type StoredLayerTree =
  | z.infer<typeof storedLayerSchema>
  | {
      type: "group";
      id: string;
      layers: StoredLayerTree[];
      visible: boolean;
      opacity: number;
      blendMode: (typeof ALL_BLEND_MODES)[number];
      locked: boolean;
    };

const storedLayerTreeSchema: z.ZodType<StoredLayerTree> = z.lazy(() =>
  z.union([
    storedLayerSchema,
    z.object({
      type: z.literal("group"),
      id: z.string(),
      layers: z.array(storedLayerTreeSchema),
      visible: z.boolean(),
      opacity: z.number().min(0).max(1),
      blendMode: z.enum(ALL_BLEND_MODES),
      locked: z.boolean(),
    }),
  ])
);

export const StoredDocumentSchema = z.object({
  layers: z.array(storedLayerTreeSchema),
  selection: z
    .object({
      width: z.number(),
      height: z.number(),
      data: z.instanceof(Blob),
    })
    .nullable(),
  size: z.object({
    width: z.number(),
    height: z.number(),
  }),
  colorHistory: z.array(z.string()).optional(),
});

export type StoredDocument = z.infer<typeof StoredDocumentSchema>;

/** State -> serialized document (layers/selection become Blobs). */
export async function serializeDocument(
  state: State,
  colorHistory: string[]
): Promise<StoredDocument> {
  return {
    layers: await mapLayersToStored(state.layers),
    selection: state.selection?.toStorable() ?? null,
    size: state.size,
    colorHistory,
  };
}

/** Serialized document -> State (+ colorHistory) ready for `open`. */
export async function deserializeDocument(
  doc: StoredDocument
): Promise<{ state: State; colorHistory: string[] }> {
  const layers = await mapStoredToLayers(doc.layers);
  const selection = doc.selection
    ? await Selection.fromStorable(doc.selection)
    : null;
  return {
    state: {
      layers,
      selection,
      size: doc.size,
      nextLayerId: computeNextLayerIdFromLayers(layers),
    },
    colorHistory: doc.colorHistory ?? [],
  };
}

async function mapLayersToStored(
  layers: readonly (Layer | LayerGroup)[]
): Promise<StoredDocument["layers"]> {
  return Promise.all(
    layers.map(async (layer) =>
      layer.type === "layer"
        ? {
            type: "layer",
            id: layer.id,
            canvas: await layer.canvas.getCanvas().convertToBlob(),
            visible: layer.visible,
            opacity: layer.opacity,
            blendMode: layer.blendMode,
            locked: layer.locked,
          }
        : {
            type: "group",
            id: layer.id,
            layers: await mapLayersToStored(layer.layers),
            visible: layer.visible,
            opacity: layer.opacity,
            blendMode: layer.blendMode,
            locked: layer.locked,
          }
    )
  );
}

async function mapStoredToLayers(
  layers: StoredDocument["layers"]
): Promise<(Layer | LayerGroup)[]> {
  return Promise.all(
    layers.map(async (layerData) => {
      if (layerData.type === "layer") {
        const image = await blobToImage(layerData.canvas);
        const canvas = new MCanvas(image.width, image.height);
        canvas.getContextWrite().drawImage(image, 0, 0);
        return {
          type: "layer",
          id: layerData.id,
          canvas,
          visible: layerData.visible,
          opacity: layerData.opacity,
          blendMode: layerData.blendMode as BlendMode,
          locked: layerData.locked,
        } satisfies Layer;
      }
      return {
        type: "group",
        id: layerData.id,
        layers: await mapStoredToLayers(layerData.layers),
        visible: layerData.visible,
        opacity: layerData.opacity,
        blendMode: layerData.blendMode as BlendMode,
        locked: layerData.locked,
      } satisfies LayerGroup;
    })
  );
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(blob);
  });
}
