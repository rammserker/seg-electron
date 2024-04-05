		<!-- Params: imgId, width, height, seq, docPrId -->
		<w:p w14:paraId="2CB7C374" w14:textId="77777777" w:rsidR="00422AF1" w:rsidRPr="008310D7" w:rsidRDefault="00422AF1" w:rsidP="00422AF1">
			<w:pPr>
				<w:jc w:val="center"/>
				<w:rPr>
					<w:lang w:val="en-US"/>
				</w:rPr>
			</w:pPr>
			<w:r w:rsidRPr="00734661">
				<w:rPr>
					<w:noProof/>
					<w:lang w:eastAsia="es-UY"/>
				</w:rPr>
				<w:drawing>
					<wp:inline distT="0" distB="0" distL="0" distR="0" wp14:anchorId="0F2D8227" wp14:editId="5FE6DB12">
						<wp:extent cx="{{ width }}" cy="{{ height }}"/>
						<wp:effectExtent l="0" t="0" r="0" b="0"/>
						<wp:docPr id="{{ docPrId }}" name="{{ seq }} {{ docPrId }}"/>
						<wp:cNvGraphicFramePr>
							<a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
						</wp:cNvGraphicFramePr>
						<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
							<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
								<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
									<pic:nvPicPr>
										<pic:cNvPr id="2" name="Imagen 2" />
										<pic:cNvPicPr>
											<a:picLocks noChangeAspect="1" noChangeArrowheads="1"/>
										</pic:cNvPicPr>
									</pic:nvPicPr>
									<pic:blipFill>
										<a:blip r:embed="{{ imgId }}" />
										<a:srcRect/>
										<a:stretch>
											<a:fillRect/>
										</a:stretch>
									</pic:blipFill>
									<pic:spPr bwMode="auto">
										<a:xfrm>
											<a:off x="0" y="0"/>
											<a:ext cx="{{ width }}" cy="{{ height }}"/>
										</a:xfrm>
										<a:prstGeom prst="rect">
											<a:avLst/>
										</a:prstGeom>
									</pic:spPr>
								</pic:pic>
							</a:graphicData>
						</a:graphic>
					</wp:inline>
				</w:drawing>
			</w:r>
		</w:p>
