"""Two-peak mountain as a dry-brush stroke in the wordmark's manner: frayed ends, ragged edges, a few flecks."""
import math, random
random.seed(7)
def stroke(points, widths, step=1.6, jitter=0.55, fray=4):
    # resample centerline
    pts=[]; 
    for (x0,y0),(x1,y1),(w0,w1) in zip(points, points[1:], zip(widths, widths[1:])):
        d=math.hypot(x1-x0,y1-y0); n=max(2,int(d/step))
        for i in range(n):
            t=i/n; pts.append((x0+(x1-x0)*t, y0+(y1-y0)*t, w0+(w1-w0)*t))
    pts.append((*points[-1], widths[-1]))
    left=[]; right=[]
    for i,(x,y,w) in enumerate(pts):
        xa,ya,_=pts[max(i-1,0)]; xb,yb,_=pts[min(i+1,len(pts)-1)]
        dx,dy=xb-xa,yb-ya; L=math.hypot(dx,dy) or 1; nx,ny=-dy/L,dx/L
        jl=random.uniform(-jitter,jitter); jr=random.uniform(-jitter,jitter)
        # dry-brush notches: occasionally bite into an edge
        if random.random()<0.10: jl-=w*0.35
        if random.random()<0.10: jr-=w*0.35
        left.append((x+nx*(w/2+jl), y+ny*(w/2+jl))); right.append((x-nx*(w/2+jr), y-ny*(w/2+jr)))
    # frayed ends: split the tip into bristles
    def bristles(end_pts_l, end_pts_r, tip, direction):
        out=[]; n=fray
        for k in range(n):
            t=(k+0.5)/n
            bx=end_pts_l[0]+(end_pts_r[0]-end_pts_l[0])*t; by=end_pts_l[1]+(end_pts_r[1]-end_pts_l[1])*t
            ln=random.uniform(1.2,3.6); half=random.uniform(0.25,0.5)
            out.append(((bx-direction[0]*0.2, by-direction[1]*0.2),(bx+direction[0]*ln, by+direction[1]*ln),(bx+direction[0]*0.2+half*(end_pts_r[0]-end_pts_l[0])/n, by+direction[1]*0.2+half*(end_pts_r[1]-end_pts_l[1])/n)))
        return out
    (sx,sy,_),(ex,ey,_)=pts[0],pts[-1]
    d0=(pts[0][0]-pts[2][0], pts[0][1]-pts[2][1]); L=math.hypot(*d0); d0=(d0[0]/L,d0[1]/L)
    d1=(pts[-1][0]-pts[-3][0], pts[-1][1]-pts[-3][1]); L=math.hypot(*d1); d1=(d1[0]/L,d1[1]/L)
    body="M"+" L".join(f"{x:.1f} {y:.1f}" for x,y in left+right[::-1])+" Z"
    tips=[]
    for (a,b,c) in bristles(left[0],right[0],(sx,sy),d0)+bristles(left[-1],right[-1],(ex,ey),d1):
        tips.append(f"M{a[0]:.1f} {a[1]:.1f} L{b[0]:.1f} {b[1]:.1f} L{c[0]:.1f} {c[1]:.1f} Z")
    return body, tips
ridge_body, ridge_tips = stroke([(4,38),(20,9),(31,26),(45,3),(61,38)], [4.4,7.4,6.6,7.6,4.2])
sweep_body, sweep_tips = stroke([(4,45.5),(20,42.6),(38,41.4),(61,43.2)], [2.8,4.6,4.4,3.0], jitter=0.35, fray=3)
flecks=[(9.5,20,0.9),(52,10,0.7),(58,24,0.6),(14,44,0.5),(48,47,0.6)]
paths=[f'<path d="{ridge_body}"/>', f'<path d="{sweep_body}"/>'] + [f'<path d="{t}"/>' for t in ridge_tips+sweep_tips] + [f'<circle cx="{x}" cy="{y}" r="{r}"/>' for x,y,r in flecks]
print("\n".join(paths))
