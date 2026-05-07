-- Fix HTML entities in camara_contratos.credor
UPDATE camara_contratos SET credor = REPLACE(credor, '&#xC7;', 'Ç') WHERE credor LIKE '%&#xC7;%';
UPDATE camara_contratos SET credor = REPLACE(credor, '&#xC3;', 'Ã') WHERE credor LIKE '%&#xC3;%';
UPDATE camara_contratos SET credor = REPLACE(credor, '&#xC1;', 'Á') WHERE credor LIKE '%&#xC1;%';
UPDATE camara_contratos SET credor = REPLACE(credor, '&#xC9;', 'É') WHERE credor LIKE '%&#xC9;%';
UPDATE camara_contratos SET credor = REPLACE(credor, '&#xCD;', 'Í') WHERE credor LIKE '%&#xCD;%';
UPDATE camara_contratos SET credor = REPLACE(credor, '&#xD3;', 'Ó') WHERE credor LIKE '%&#xD3;%';
UPDATE camara_contratos SET credor = REPLACE(credor, '&#xDA;', 'Ú') WHERE credor LIKE '%&#xDA;%';
UPDATE camara_contratos SET credor = REPLACE(credor, '&#xD5;', 'Õ') WHERE credor LIKE '%&#xD5;%';
UPDATE camara_contratos SET credor = REPLACE(credor, '&#xCA;', 'Ê') WHERE credor LIKE '%&#xCA;%';
UPDATE camara_contratos SET credor = REPLACE(credor, '&#xE7;', 'ç') WHERE credor LIKE '%&#xE7;%';
UPDATE camara_contratos SET credor = REPLACE(credor, '&#xE3;', 'ã') WHERE credor LIKE '%&#xE3;%';
UPDATE camara_contratos SET credor = REPLACE(credor, '&#xE1;', 'á') WHERE credor LIKE '%&#xE1;%';
UPDATE camara_contratos SET credor = REPLACE(credor, '&#xE9;', 'é') WHERE credor LIKE '%&#xE9;%';
UPDATE camara_contratos SET credor = REPLACE(credor, '&#xED;', 'í') WHERE credor LIKE '%&#xED;%';
UPDATE camara_contratos SET credor = REPLACE(credor, '&#xF3;', 'ó') WHERE credor LIKE '%&#xF3;%';
UPDATE camara_contratos SET credor = REPLACE(credor, '&#xFA;', 'ú') WHERE credor LIKE '%&#xFA;%';
UPDATE camara_contratos SET credor = REPLACE(credor, '&#xF5;', 'õ') WHERE credor LIKE '%&#xF5;%';
UPDATE camara_contratos SET credor = REPLACE(credor, '&#xEA;', 'ê') WHERE credor LIKE '%&#xEA;%';

-- Also fix objeto field
UPDATE camara_contratos SET objeto = REPLACE(objeto, '&#xC7;', 'Ç') WHERE objeto LIKE '%&#xC7;%';
UPDATE camara_contratos SET objeto = REPLACE(objeto, '&#xC3;', 'Ã') WHERE objeto LIKE '%&#xC3;%';
UPDATE camara_contratos SET objeto = REPLACE(objeto, '&#xC1;', 'Á') WHERE objeto LIKE '%&#xC1;%';
UPDATE camara_contratos SET objeto = REPLACE(objeto, '&#xC9;', 'É') WHERE objeto LIKE '%&#xC9;%';
UPDATE camara_contratos SET objeto = REPLACE(objeto, '&#xCD;', 'Í') WHERE objeto LIKE '%&#xCD;%';
UPDATE camara_contratos SET objeto = REPLACE(objeto, '&#xD3;', 'Ó') WHERE objeto LIKE '%&#xD3;%';
UPDATE camara_contratos SET objeto = REPLACE(objeto, '&#xDA;', 'Ú') WHERE objeto LIKE '%&#xDA;%';
UPDATE camara_contratos SET objeto = REPLACE(objeto, '&#xD5;', 'Õ') WHERE objeto LIKE '%&#xD5;%';
UPDATE camara_contratos SET objeto = REPLACE(objeto, '&#xE7;', 'ç') WHERE objeto LIKE '%&#xE7;%';
UPDATE camara_contratos SET objeto = REPLACE(objeto, '&#xE3;', 'ã') WHERE objeto LIKE '%&#xE3;%';
UPDATE camara_contratos SET objeto = REPLACE(objeto, '&#xE1;', 'á') WHERE objeto LIKE '%&#xE1;%';
UPDATE camara_contratos SET objeto = REPLACE(objeto, '&#xE9;', 'é') WHERE objeto LIKE '%&#xE9;%';
UPDATE camara_contratos SET objeto = REPLACE(objeto, '&#xED;', 'í') WHERE objeto LIKE '%&#xED;%';
UPDATE camara_contratos SET objeto = REPLACE(objeto, '&#xF3;', 'ó') WHERE objeto LIKE '%&#xF3;%';
UPDATE camara_contratos SET objeto = REPLACE(objeto, '&#xFA;', 'ú') WHERE objeto LIKE '%&#xFA;%';
UPDATE camara_contratos SET objeto = REPLACE(objeto, '&#xF5;', 'õ') WHERE objeto LIKE '%&#xF5;%';