// Variant of d3 link force: impulses run source→ghost only (ghost targets are not pulled).

function constant<T>(x: T) {
  return function () {
    return x;
  };
}

function jiggle(random: () => number) {
  return (random() - 0.5) * 1e-6;
}

type LinkNode = {
  index: number;
  id?: string | number;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  nodeKind?: string;
};

export type LacunaLinkDatum = {
  index?: number;
  source: string | number | LinkNode;
  target: string | number | LinkNode;
};

export default function lacunaLinkForce(linksArg: LacunaLinkDatum[] | null) {
  let id: (d: LinkNode, i: number, nodes: LinkNode[]) => string | number | undefined = (
    d: LinkNode,
  ) => (d.id !== undefined ? d.id : (d.index as number)),
    strength: (
      link: LacunaLinkDatum,
      i: number,
      links: LacunaLinkDatum[],
    ) => number = defaultStrength,
    strengths: number[],
    distance: (
      link: LacunaLinkDatum,
      i: number,
      links: LacunaLinkDatum[],
    ) => number = constant(30) as (
      link: LacunaLinkDatum,
      i: number,
      links: LacunaLinkDatum[],
    ) => number,
    distances: number[],
    nodes: LinkNode[],
    nDim: number,
    count: number[] = [],
    bias: number[] = [],
    random: () => number,
    iterations = 1;

  let links: LacunaLinkDatum[] = linksArg ?? [];

  function defaultStrength(link: LacunaLinkDatum) {
    const s = link.source as LinkNode;
    const t = link.target as LinkNode;
    return 1 / Math.max(1, Math.min(count[s.index], count[t.index]));
  }

  function force(alpha: number) {
    const linkList = links!;
    for (let k = 0, n = linkList.length; k < iterations; ++k) {
      for (let i = 0; i < n; ++i) {
        const link = linkList[i];
        const source = link.source as LinkNode;
        const target = link.target as LinkNode;
        let x =
          (target.x ?? 0) +
          (target.vx ?? 0) -
          (source.x ?? 0) -
          (source.vx ?? 0) || jiggle(random);
        let y = 0;
        let z = 0;
        if (nDim > 1) {
          y =
            (target.y ?? 0) +
            (target.vy ?? 0) -
            (source.y ?? 0) -
            (source.vy ?? 0) || jiggle(random);
        }
        if (nDim > 2) {
          z =
            (target.z ?? 0) +
            (target.vz ?? 0) -
            (source.z ?? 0) -
            (source.vz ?? 0) || jiggle(random);
        }
        const len = Math.sqrt(x * x + y * y + z * z);
        if (len < 1e-12) continue;
        const k =
          ((len - distances[i]) / len) * alpha * strengths[i];
        x *= k;
        y *= k;
        z *= k;

        const ghostTarget =
          target.nodeKind === "ghost";

        if (ghostTarget) {
          source.vx = (source.vx ?? 0) + x;
          if (nDim > 1) source.vy = (source.vy ?? 0) + y;
          if (nDim > 2) source.vz = (source.vz ?? 0) + z;
        } else {
          const b = bias[i];
          target.vx = (target.vx ?? 0) - x * b;
          if (nDim > 1) target.vy = (target.vy ?? 0) - y * b;
          if (nDim > 2) target.vz = (target.vz ?? 0) - z * b;
          source.vx = (source.vx ?? 0) + x * (1 - b);
          if (nDim > 1) source.vy = (source.vy ?? 0) + y * (1 - b);
          if (nDim > 2) source.vz = (source.vz ?? 0) + z * (1 - b);
        }
      }
    }
  }

  function initialize() {
    if (!nodes) return;

    const n = nodes.length;
    count = new Array(n);
    const nodeById = new Map<string | number, LinkNode>();
    for (let idx = 0; idx < nodes.length; idx++) {
      const d = nodes[idx];
      const key = id(d, idx, nodes);
      if (key !== undefined && key !== null) {
        nodeById.set(key, d);
      }
    }

    const resolved: LacunaLinkDatum[] = [];
    for (let i = 0; i < links.length; ++i) {
      const orig = links[i];
      let s: string | number | LinkNode = orig.source;
      let t: string | number | LinkNode = orig.target;
      if (typeof s !== "object") {
        const node = nodeById.get(s as string | number);
        if (!node) continue;
        s = node;
      }
      if (typeof t !== "object") {
        const node = nodeById.get(t as string | number);
        if (!node) continue;
        t = node;
      }
      resolved.push({ ...orig, source: s, target: t });
    }
    links = resolved;

    const m = links.length;
    for (let i = 0; i < m; ++i) {
      const link = links[i];
      link.index = i;
      const s = link.source as LinkNode;
      const t = link.target as LinkNode;
      count[s.index] = (count[s.index] || 0) + 1;
      count[t.index] = (count[t.index] || 0) + 1;
    }

    bias = new Array(m);
    for (let i = 0; i < m; ++i) {
      const link = links[i];
      const s = link.source as LinkNode;
      const t = link.target as LinkNode;
      bias[i] = count[s.index] / (count[s.index] + count[t.index]);
    }

    strengths = new Array(m);
    initializeStrength();
    distances = new Array(m);
    initializeDistance();
  }

  function initializeStrength() {
    if (!nodes) return;
    for (let i = 0, n = links!.length; i < n; ++i) {
      strengths[i] = +strength(links![i], i, links!);
    }
  }

  function initializeDistance() {
    if (!nodes) return;
    for (let i = 0, n = links!.length; i < n; ++i) {
      distances[i] = +distance(links![i], i, links!);
    }
  }

  force.initialize = function (_nodes: LinkNode[], ...args: unknown[]) {
    nodes = _nodes;
    random =
      (args.find((arg) => typeof arg === "function") as () => number) ||
      Math.random;
    nDim = (args.find((arg) => [1, 2, 3].includes(arg as number)) as number) || 2;
    initialize();
  };

  force.links = function (_?: LacunaLinkDatum[]) {
    return arguments.length ? ((links = _!), initialize(), force) : links!;
  };

  force.id = function (
    _?: (d: LinkNode, i: number, nodes: LinkNode[]) => string | number | undefined,
  ) {
    return arguments.length ? ((id = _!), initialize(), force) : id;
  };

  force.iterations = function (_?: number) {
    return arguments.length ? ((iterations = +_!), force) : iterations;
  };

  force.strength = function (
    _?:
      | ((
          link: LacunaLinkDatum,
          i: number,
          links: LacunaLinkDatum[],
        ) => number)
      | number,
  ) {
    if (!arguments.length) return strength;
    strength = (
      typeof _ === "function" ? _ : constant(+(_ as number))
    ) as typeof strength;
    initializeStrength();
    return force;
  };

  force.distance = function (
    _?:
      | ((
          link: LacunaLinkDatum,
          i: number,
          links: LacunaLinkDatum[],
        ) => number)
      | number,
  ) {
    if (!arguments.length) return distance;
    distance = (
      typeof _ === "function" ? _ : constant(+(_ as number))
    ) as typeof distance;
    initializeDistance();
    return force;
  };

  return force;
}
