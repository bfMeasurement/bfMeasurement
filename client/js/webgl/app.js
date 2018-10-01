var MoreLight = function(){
  var _this = this;
  this.Init = function () {
    loadTextResource('./js/webgl/shader.vs.glsl', function (vsErr, vsText) {
      if (vsErr) {
        console.error(vsErr);
      } else {
        loadTextResource('./js/webgl/shader.fs.glsl', function (fsErr, fsText) {
          if (fsErr) {
            console.error(fsErr);
          } else {
            loadJSONResource('./js/webgl/monkey.json', function (modelErr, monkeyObj) {
              if (modelErr) {
                console.error(fsErr);
              } else {
                loadImage('./js/webgl/color.png', function (imgErr, img) {
                  if (imgErr) {
                    console.error(imgErr);
                  } else { 
                    _this.run(vsText, fsText, monkeyObj, img);
                  }
                });
              }
            });
          }
        });
      }
    })
  }
  this.begin = function(cb, ID) {
    _this.cb = cb;
    _this.ID = ID;
    this.Init();
  }
  this.run= function(vsText, fsText, monkeyObj, img) {
    var vertices = monkeyObj.meshes[0].vertices;
    var indices = this.susanIndices = [].concat.apply([], monkeyObj.meshes[0].faces);
    var texCoords = monkeyObj.meshes[0].texturecoords[0];
    var normals = monkeyObj.meshes[0].normals;

    var gl;
    canvas = getCanvas("can_aa");
    gl = getGLAA(canvas);
    var WebGL = true;

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);

    //
    // Create shaders
    //
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertexShader, vsText);
    gl.shaderSource(fragmentShader, fsText);

    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error('ERROR compiling vertex shader!',
          gl.getShaderInfoLog(vertexShader));
      return;
    }

    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error('ERROR compiling fragment shader!',
          gl.getShaderInfoLog(fragmentShader));
      return;
    }

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('ERROR linking program!', gl.getProgramInfoLog(program));
      return;
    }
    gl.validateProgram(program);
    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
      console.error('ERROR validating program!',
          gl.getProgramInfoLog(program));
      return;
    }

    var susanPosVertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, susanPosVertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices),
        gl.STATIC_DRAW);

    var susanTexCoordVertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, susanTexCoordVertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords),
        gl.STATIC_DRAW);

    var susanIndexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, susanIndexBufferObject);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices),
        gl.STATIC_DRAW);

    var susanNormalBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, susanNormalBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, susanPosVertexBufferObject);
    var positionAttribLocation =
      gl.getAttribLocation(program, 'vertPosition');
    gl.vertexAttribPointer(
        positionAttribLocation, // Attribute location
        3,                      // Number of elements per attribute
        gl.FLOAT,               // Type of elements
        gl.FALSE,
        3 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
        0 // Offset from the beginning of a single vertex to this attribute
        );
    gl.enableVertexAttribArray(positionAttribLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, susanTexCoordVertexBufferObject);
    var texCoordAttribLocation =
      gl.getAttribLocation(program, 'vertTexCoord');
    gl.vertexAttribPointer(
        texCoordAttribLocation, // Attribute location
        2,                      // Number of elements per attribute
        gl.FLOAT,               // Type of elements
        gl.FALSE,
        2 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
        0);
    gl.enableVertexAttribArray(texCoordAttribLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, susanNormalBufferObject);
    var normalAttribLocation = gl.getAttribLocation(program, 'vertNormal');
    gl.vertexAttribPointer(normalAttribLocation, 3, gl.FLOAT, gl.TRUE,
        3 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.enableVertexAttribArray(normalAttribLocation);

    //
    // Create texture
    //
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
        img);
    gl.bindTexture(gl.TEXTURE_2D, null);

    // Tell OpenGL state machine which program should be active.
    gl.useProgram(program);

    var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
    var matViewUniformLocation = gl.getUniformLocation(program, 'mView');
    var matProjUniformLocation = gl.getUniformLocation(program, 'mProj');

    var worldMatrix = new Float32Array(16);
    var viewMatrix = new Float32Array(16);
    var projMatrix = new Float32Array(16);
    mat4.identity(worldMatrix);
    mat4.lookAt(viewMatrix, [ 0, 0, -7 ], [ 0, 0, 0 ], [ 0, 1, 0 ]);

    mat4.perspective(projMatrix, glMatrix.toRadian(45),
        canvas.width / canvas.height, 0.1, 1000.0);

    gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
    gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
    gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);

    var xRotationMatrix = new Float32Array(16);
    var yRotationMatrix = new Float32Array(16);

    //
    // Lighting information
    //
    gl.useProgram(program);

    var ambientUniformLocation =
      gl.getUniformLocation(program, 'ambientLightIntensity');
    var sunlightDirUniformLocation =
      gl.getUniformLocation(program, 'sun.direction');
    var sunlightDiffuse = gl.getUniformLocation(program, 'sun.diffuse');
    var sunlightSpecular = gl.getUniformLocation(program, 'sun.specular');

    gl.uniform3f(ambientUniformLocation, 0.3, 0.3, 0.3);
    gl.uniform3f(sunlightDirUniformLocation, 0.8, -0.8, -0.8);
    gl.uniform3f(sunlightDiffuse, 0.75, 0.75, 1.0);
    gl.uniform3f(sunlightSpecular, 0.8, 0.8, 0.8);

    //
    // Main render loop
    //
    var identityMatrix = new Float32Array(16);
    mat4.identity(identityMatrix);
    var angle = 0;
    var count = 49;
    var end = 51;
    var ven, ren;
    var identityMatrix = new Float32Array(16);
    mat4.identity(identityMatrix);
    gl.enable(gl.DEPTH_TEST);
    var loop = function() {
      var frame = requestAnimationFrame(loop);
      angle = count++ / 20;
      mat4.rotate(yRotationMatrix, identityMatrix, angle, [ 0, 1, 0 ]);
      mat4.rotate(xRotationMatrix, identityMatrix, angle / 4, [ 1, 0, 0 ]);
      mat4.mul(worldMatrix, yRotationMatrix, xRotationMatrix);
      gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);

      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.activeTexture(gl.TEXTURE0);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
      if (count == end) {
        cancelAnimationFrame(frame);
        _this.cb(_this.ID, canvas.toDataURL("image/png", 1.0));
      }

    };
    requestAnimationFrame(loop);
  };
};

