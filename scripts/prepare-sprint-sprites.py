"""Prepare supplied performance photos locally; never modifies the originals.
Run in a Python environment with rembg[cpu] and Pillow installed:
  U2NET_HOME=/tmp/aakash-models python scripts/prepare-sprint-sprites.py --source /path/to/photos
"""
import argparse,json,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
from rembg import remove,new_session
import numpy as np
from scipy import ndimage

args=argparse.ArgumentParser();args.add_argument('--source',type=Path,required=True);args.add_argument('--model',default='auto');args.add_argument('--world-tour-poster',type=Path);args.add_argument('--only');opt=args.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'public/sprites';out.mkdir(parents=True,exist_ok=True)
# Crops exclude photo captions and audience members before segmentation.
poses=[('pose_run_1','download.jpeg',(80,35,285,540)),('pose_run_2','images (1).jpeg',(214,40,390,416)),('pose_mid_air','images.jpeg',(76,20,246,410)),('pose_rant_stop','download (2).jpeg',(24,42,330,517)),('era_1_theatre','images.jpeg',(76,20,246,410)),('era_2_corporate','download (2).jpeg',(24,42,330,517)),('era_3_comicstaan','download (6).jpeg',(45,20,275,425)),('era_4_worldtour',opt.world_tour_poster or 'download (7).jpeg',(70,188,345,426) if opt.world_tour_poster else (0,0,339,425))]
sessions={};manifest=json.loads((out/'manifest.json').read_text()) if opt.only and (out/'manifest.json').exists() else []
if opt.only:
    poses=[pose for pose in poses if pose[0]==opt.only]
    if not poses:raise ValueError('Unknown sprite name')
    manifest=[entry for entry in manifest if entry['file']!=opt.only+'.png']
for name,source,box in poses:
    photo=Image.open(opt.source/source).convert('RGB').crop(box)
    model=opt.model if opt.model!='auto' else ('u2netp' if name in ['pose_run_1','pose_mid_air','era_1_theatre'] else 'u2net_human_seg')
    if model not in sessions:sessions[model]=new_session(model)
    cut=remove(photo,session=sessions[model],post_process_mask=True).convert('RGBA')
    if name=='era_4_worldtour' and opt.world_tour_poster:
        # Refine the supplied poster silhouette; a human model drops the thin
        # outstretched arm/back leg, while a general model retains tour lettering.
        # These source-space points follow the photographed limbs, not generated ones.
        points=[(246,204),(256,202),(268,205),(275,210),(274,218),(270,224),(270,232),(267,240),(263,246),(257,248),(264,253),(270,264),(277,276),(292,280),(302,277),(308,275),(309,267),(311,264),(314,264),(313,270),(319,265),(324,265),(325,267),(319,272),(328,269),(330,271),(324,276),(330,274),(331,277),(324,281),(326,281),(325,284),(317,286),(312,282),(303,290),(291,294),(280,293),(270,285),(261,275),(253,279),(240,285),(229,300),(225,311),(225,318),(232,338),(235,354),(229,366),(219,386),(209,403),(218,408),(223,413),(226,417),(222,422),(210,424),(189,419),(180,416),(176,411),(179,406),(190,402),(194,378),(201,357),(197,349),(194,342),(184,354),(170,362),(123,362),(116,358),(111,369),(105,374),(100,372),(100,365),(103,355),(106,344),(109,339),(116,339),(122,342),(168,340),(174,327),(176,313),(176,298),(187,282),(194,268),(182,270),(163,276),(142,279),(130,282),(124,287),(120,286),(122,280),(116,283),(113,281),(118,277),(112,280),(109,277),(117,273),(111,275),(110,272),(125,265),(151,254),(175,245),(194,240),(215,235),(237,231),(243,230),(243,219),(244,210)]
        matte=Image.new('L',(photo.width*4,photo.height*4));draw=ImageDraw.Draw(matte)
        draw.polygon([((x-box[0])*4,(y-box[1])*4) for x,y in points],fill=255)
        matte=matte.resize(photo.size,Image.Resampling.LANCZOS)
        hsv=np.array(photo.convert('HSV'));a=np.array(matte)
        yellow=(hsv[:,:,0]>=28)&(hsv[:,:,0]<=57)&(hsv[:,:,1]>85)&(hsv[:,:,2]>125)
        a[yellow]=0
        cut=photo.convert('RGBA');cut.putalpha(Image.fromarray(a))
        model='person segmentation + source silhouette refinement'

    # Drop isolated background debris, retaining the largest connected silhouette.
    alpha=np.array(cut.getchannel('A'));labels,count=ndimage.label(alpha>24)
    if not count:raise RuntimeError('No foreground found: '+source)
    areas=np.bincount(labels.ravel());areas[0]=0;keep=labels==areas.argmax()
    # Expand the main component slightly to retain anti-aliased edges.
    keep=ndimage.binary_dilation(keep,iterations=2);alpha[~keep]=0;cut.putalpha(Image.fromarray(alpha))
    bbox=cut.getchannel('A').getbbox()
    if not bbox:raise RuntimeError('Empty foreground: '+source)
    cut=cut.crop(bbox);scale=min(520/cut.width,744/cut.height)
    cut=cut.resize((round(cut.width*scale),round(cut.height*scale)),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(600,800),(0,0,0,0));canvas.alpha_composite(cut,((600-cut.width)//2,784-cut.height))
    canvas.save(out/(name+'.png'),optimize=True)
    manifest.append({'file':name+'.png','source':Path(source).name,'sourceCrop':box,'size':[600,800],'baseline':784,'alphaBBox':canvas.getchannel('A').getbbox(),'model':model,'revision':hashlib.sha256((out/(name+'.png')).read_bytes()).hexdigest()[:12]})
    print('Prepared',name,flush=True)
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
