import json,random,math
random.seed(9)
S=[] # surfaces: (corners list of 3D, tone 0..1, weight multiplier, kind)
def quad(a,b,c,d,tone,w=1,k='f'): S.append(([a,b,c,d],tone,w,k))
def tri(a,b,c,tone,w=1,k='f'): S.append(([a,b,c],tone,w,k))
def box(x0,x1,y0,y1,z0,z1,tone,w=1,k='f'):
    quad((x0,y1,z0),(x1,y1,z0),(x1,y1,z1),(x0,y1,z1),tone*.8,w,k)
    for z in (z0,z1): quad((x0,y0,z),(x1,y0,z),(x1,y1,z),(x0,y1,z),tone,w,k)
    for x in (x0,x1): quad((x,y0,z0),(x,y0,z1),(x,y1,z1),(x,y1,z0),tone*.9,w,k)
OUT=[((0,0),(28,0)),((28,0),(28,4)),((28,4),(52,4)),((52,4),(52,0)),((52,0),(68,0)),((68,0),(68,40)),((68,40),(52,40)),((52,40),(52,44)),((52,44),(28,44)),((28,44),(28,50)),((28,50),(0,50)),((0,50),(0,0))]
H=9;T=.6
for (a,b) in OUT:
    x0,x1=sorted((a[0],b[0]));z0,z1=sorted((a[1],b[1]))
    if x0==x1:x0-=T/2;x1+=T/2
    else:z0-=T/2;z1+=T/2
    box(x0,x1,0,H,z0,z1,.86,3.6,'g')
    box(x0-.1,x1+.1,0,1,z0-.1,z1+.1,.58,1.0,'g')
def gable(x0,x1,z0,z1,base,rise,along_z,oh=1.6):
    half=((x1-x0) if along_z else (z1-z0))/2;p=rise/half;xm=(x0+x1)/2;zm=(z0+z1)/2;rt=.2
    if along_z:
        quad((x1+oh,base-oh*p,z0-oh),(x1+oh,base-oh*p,z1+oh),(xm,base+rise,z1+oh),(xm,base+rise,z0-oh),rt,1.5,'roof')
        quad((x0-oh,base-oh*p,z0-oh),(x0-oh,base-oh*p,z1+oh),(xm,base+rise,z1+oh),(xm,base+rise,z0-oh),rt,1.5,'roof')
        for z in (z0,z1): tri((x0,base,z),(x1,base,z),(xm,base+rise,z),.8,1,'g')
    else:
        quad((x0-oh,base-oh*p,z1+oh),(x1+oh,base-oh*p,z1+oh),(x1+oh,base+rise,zm),(x0-oh,base+rise,zm),rt,1.5,'roof')
        quad((x0-oh,base-oh*p,z0-oh),(x1+oh,base-oh*p,z0-oh),(x1+oh,base+rise,zm),(x0-oh,base+rise,zm),rt,1.5,'roof')
        for x in (x0,x1): tri((x,base,z0),(x,base,z1),(x,base+rise,zm),.8,1,'g')
gable(0,28,0,50,9,7.0,True);gable(28,52,4,44,9,20*4.62/12,False);gable(52,68,0,40,9,20*4.62/12,False);gable(34,46,36,52,8.4,3.5,True,1.2)
# porch columns + deck
for px,pz in ((35.2,51.2),(44.8,51.2)): box(px-.4,px+.4,.3,8.4,pz-.4,pz+.4,.9,1.2)
quad((33,.1,44),(47,.1,44),(47,.1,52.4),(33,.1,52.4),.7,.8)
# windows: dark glass + light frame
WIN=[(31.5,44,0,1,5,5.5,2.2),(48.5,44,0,1,5,5.5,2.2),(60,40,0,1,5,5.5,2.2),(68,8,1,0,3,4.5,2.8),(68,32,1,0,3,4.5,2.8),(0,34,-1,0,2,2.5,4.5),(0,42,-1,0,2,2.5,4.5),(18,0,0,-1,4.5,4.5,2.8),(34,4,0,-1,4,4.5,2.8),(46,4,0,-1,4,4.5,2.8),(60,0,0,-1,4.5,4.5,2.8)]
for cx,cz,nx,nz,w,hh,y0 in WIN:
    o=.4
    if nz!=0:
        A=(cx-w/2,y0,cz+nz*o);B=(cx+w/2,y0,cz+nz*o);C=(cx+w/2,y0+hh,cz+nz*o);D=(cx-w/2,y0+hh,cz+nz*o)
    else:
        A=(cx+nx*o,y0,cz-w/2);B=(cx+nx*o,y0,cz+w/2);C=(cx+nx*o,y0+hh,cz+w/2);D=(cx+nx*o,y0+hh,cz-w/2)
    quad(A,B,C,D,.22,1.6,'win')
# doors: front double door + garage
quad((37.9,.1,44.4),(42.1,.1,44.4),(42.1,7.1,44.4),(37.9,7.1,44.4),.15,1.7,'win')
quad((6,0,50.5),(22,0,50.5),(22,7.6,50.5),(6,7.6,50.5),.2,1.4,'win')
for k in range(1,4): S.append(([(6,k*1.9,50.6),(22,k*1.9,50.6)],.0,1,'line'))
for k in range(1,8): S.append(([(6+k*2,0,50.6),(6+k*2,7.6,50.6)],.0,1,'line'))
def area(c):
    a=0
    for i in range(1,len(c)-1):
        u=[c[i][j]-c[0][j] for j in range(3)];v=[c[i+1][j]-c[0][j] for j in range(3)]
        x=(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);a+=.5*math.sqrt(sum(t*t for t in x))
    return a
tot=sum(area(c)*w*(1.12-t) for c,t,w,k in S if k!='line')
N=60000;pts=[]
for c,t,w,k in S:
    tone=int(max(0,min(1,t))*255)
    if k=='line':
        a,b=c;L=math.dist(a,b)
        for _ in range(int(L*5)):
            u=random.random();pts.append([a[i]+(b[i]-a[i])*u for i in range(3)]+[40])
        continue
    A=area(c);n=int(N*A*w*(1.12-t)/tot)+1
    tris=[(c[0],c[i],c[i+1]) for i in range(1,len(c)-1)]
    ars=[]
    for a,b,d in tris:
        u=[b[j]-a[j] for j in range(3)];v=[d[j]-a[j] for j in range(3)]
        x=(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);ars.append(math.sqrt(sum(q*q for q in x)))
    s=sum(ars) or 1
    for _ in range(n):
        r=random.random()*s;j=0
        while j<len(tris)-1 and r>ars[j]:r-=ars[j];j+=1
        a,b,d=tris[j];u,v=random.random(),random.random()
        if u+v>1:u,v=1-u,1-v
        pts.append([a[i]+(b[i]-a[i])*u+(d[i]-a[i])*v for i in range(3)]+[tone])
    # outline emphasis on real surfaces
    if k in('f','g','roof','win'):
        for i in range(len(c)):
            a=c[i];b=c[(i+1)%len(c)];L=math.dist(a,b)
            for _ in range(int(L*(1.6 if k!='roof' else 3.0))):
                u=random.random();pts.append([a[q]+(b[q]-a[q])*u for q in range(3)]+[tone*3//10])
random.shuffle(pts)
cx,cz=34,38
out=[]
for x,y,z,t in pts: out+= [round((x-cx)*10),round(y*10),round((z-cz)*10),t]
json.dump(out,open('../assets/plan/house3d.json','w'),separators=(',',':'))
import os;print(len(pts),os.path.getsize('../assets/plan/house3d.json'))
