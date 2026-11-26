"""Normalize imagegen outfit edits to the existing runner's stage geometry.
This only trims transparent padding and resamples; clothing is edited by imagegen.
"""
from pathlib import Path
from PIL import Image
import hashlib,json
import numpy as np
from scipy import ndimage

root=Path(__file__).resolve().parents[1]
sprites=root/'public/sprites'
manifest=json.loads((sprites/'manifest.json').read_text())
original=next(x for x in manifest if x['file']=='era_4_worldtour.png')
left,top,right,bottom=original['alphaBBox']
for era,outfit in [('era_1_theatre','theatre'),('era_2_corporate','corporate'),('era_3_comicstaan','comicstaan-winner')]:
 source=root/'assets/runner-outfits'/f'{outfit}.png'
 image=Image.open(source).convert('RGBA')
 alpha=np.array(image.getchannel('A'))
 labels,count=ndimage.label(alpha>24)
 if not count:raise ValueError('No alpha silhouette: '+outfit)
 areas=np.bincount(labels.ravel());areas[0]=0
 silhouette=ndimage.binary_dilation(labels==areas.argmax(),iterations=2)
 alpha[~silhouette]=0;image.putalpha(Image.fromarray(alpha))
 bbox=image.getchannel('A').getbbox();image=image.crop(bbox)
 # Preserve aspect ratio and the same stage footprint as the original runner.
 ratio=min((right-left)/image.width,(bottom-top)/image.height)
 image=image.resize((round(image.width*ratio),round(image.height*ratio)),Image.Resampling.LANCZOS)
 canvas=Image.new('RGBA',(600,800),(0,0,0,0))
 canvas.alpha_composite(image,((left+right-image.width)//2,bottom-image.height))
 target=sprites/(era+'.png');canvas.save(target,optimize=True)
 entry={'file':target.name,'source':'assets/runner-outfits/'+source.name,'size':[600,800],'baseline':bottom,'alphaBBox':canvas.getchannel('A').getbbox(),'model':'built-in image_gen, identity-preserving clothing edit','poseSource':'era_4_worldtour.png','outfit':outfit,'revision':hashlib.sha256(target.read_bytes()).hexdigest()[:12]}
 if era=='era_3_comicstaan':entry['prop']='hand-held winner trophy'
 manifest=[x for x in manifest if x['file']!=target.name]+[entry]
 print(era,entry['alphaBBox'])
(sprites/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
