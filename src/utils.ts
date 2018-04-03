import tar from 'tar-stream';
import tarFs from 'tar-fs';
import gunzipMaybe from 'gunzip-maybe';
import { error } from 'util';

const getFileName = (entryName: string, virtualPath: number): string | null => { 
  entryName = entryName.replace(/^\/+/, '');
  for (let t = 0; t < virtualPath; ++t) {
    const index = entryName.indexOf('/');
    if (index === -1) {
      return null;
    }
    entryName = entryName.substr(index + 1);
  }
  return entryName;
}

const readFileFromArchive = async (fileName: string, buffer: Buffer, { virtualPath = 0} = {} ) => {
  return new Promise<string>((resolve, reject) => {
    const extractor = tar.extract();
    extractor.on('entry', (header, stream, next) => {
      if (getFileName(header.name, virtualPath) === fileName) {
        let buffers: Buffer[] = [];

        stream.on('data', data => {
          buffers.push(data);
        });

        stream.on('error', error => {
          reject(error);
        });

        stream.on('end', () => {
          resolve(Buffer.concat(buffers).toString('utf-8'));
        });
      } else {
        stream.on('end', () => {
          next();
        });
      }
      stream.resume();
    });

    extractor.on('error', error => {
      reject(error);
    })

    extractor.on('finish', () => {
      reject(new Error(`Couldn't find "${fileName}" inside the archive`));
    });

    const gunzipper = gunzipMaybe();
    
    gunzipper.pipe(extractor);
    gunzipper.on('error', error => {
      reject(error);
    });

    gunzipper.write(buffer);
    
    gunzipper.end();
  });
}

const readPackageJSONFromArchive = async (packageBuffer: Buffer) => {
  return await readFileFromArchive('package.json', packageBuffer, { virtualPath: 1 });
}

const extractArchiveTo = async (packageBuffer: Buffer, target: string, { virtualPath = 0} = {}) => {
  return new Promise((resolve, reject) => {
    const map = (header: tar.TarStreamHeader) => {
      header.name = getFileName(header.name, virtualPath)!;
      return header;
    }

    const gunzipper = gunzipMaybe();
    const extractor = tarFs.extract(target, { map });

    gunzipper.pipe(extractor);

    extractor.on('error', (error: Error) => {
      reject(error);
    });

    extractor.on('finish', () => {
      resolve();
    });

    gunzipper.write(packageBuffer);
    gunzipper.end();
  });
}

const extractNpmArchiveTo = async (packageBuffer: Buffer, target: string) => {
  return await extractArchiveTo(packageBuffer, target, { virtualPath: 1 });
}

export {
  readPackageJSONFromArchive,
  extractNpmArchiveTo
}